/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as sinon from 'sinon';
import * as assert from 'assert';
import * as path from 'vs/base/common/path';
import * as fs from 'fs';
import * as os from 'os';
import * as uuid from 'vs/base/common/uuid';
import { mkdirp, rimraf, RimRafMode } from 'vs/base/node/pfs';
import {
	IExtensionGalleryService, IGalleryExtensionAssets, IGalleryExtension, IExtensionManagementService,
	DidInstallExtensionEvent, DidUninstallExtensionEvent, InstallExtensionEvent, IExtensionIdentifier
} from 'vs/platform/extensionManagement/common/extensionManagement';
import { IExtensionEnablementService } from 'vs/workbench/services/extensionManagement/common/extensionManagement';
import { ExtensionTipsService } from 'vs/workbench/contrib/extensions/browser/extensionTipsService';
import { ExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionGalleryService';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { Emitter } from 'vs/base/common/event';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { TestContextService, TestLifecycleService, TestSharedProcessService, productService } from 'vs/workbench/test/workbenchTestServices';
import { TestNotificationService } from 'vs/platform/notification/test/common/testNotificationService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { URI } from 'vs/base/common/uri';
import { testWorkspace } from 'vs/platform/workspace/test/common/testWorkspace';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { IPager } from 'vs/base/common/paging';
import { assign } from 'vs/base/common/objects';
import { getGalleryExtensionId } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { ConfigurationKey } from 'vs/workbench/contrib/extensions/common/extensions';
import { ExtensionManagementService } from 'vs/platform/extensionManagement/node/extensionManagementService';
import { TestExtensionEnablementService } from 'vs/workbench/services/extensionManagement/test/electron-browser/extensionEnablementService.test';
import { IURLService } from 'vs/platform/url/common/url';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ILifecycleService } from 'vs/platform/lifecycle/common/lifecycle';
import { INotificationService, Severity, IPromptChoice, IPromptOptions } from 'vs/platform/notification/common/notification';
import { URLService } from 'vs/platform/url/node/urlService';
import { IExperimentService } from 'vs/workbench/contrib/experiments/common/experimentService';
import { TestExperimentService } from 'vs/workbench/contrib/experiments/test/electron-browser/experimentService.test';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { ExtensionType } from 'vs/platform/extensions/common/extensions';
import { ISharedProcessService } from 'vs/platform/ipc/electron-browser/sharedProcessService';
import { FileService } from 'vs/platform/files/common/fileService';
import { NullLogService } from 'vs/platform/log/common/log';
import { Schemas } from 'vs/base/common/network';
import { DiskFileSystemProvider } from 'vs/platform/files/node/diskFileSystemProvider';
import { IFileService } from 'vs/platform/files/common/files';
import { IProductService } from 'vs/platform/product/common/product';

const mockExtensionGallery: IGalleryExtension[] = [
	aGalleryExtension('MockExtension1', {
		displayName: 'Mock Extension 1',
		version: '1.5',
		publisherId: 'mockPublisher1Id',
		publisher: 'mockPublisher1',
		publisherDisplayName: 'Mock Publisher 1',
		description: 'Mock Description',
		installCount: 1000,
		rating: 4,
		ratingCount: 100
	}, {
		dependencies: ['pub.1'],
	}, {
		manifest: { uri: 'uri:manifest', fallbackUri: 'fallback:manifest' },
		readme: { uri: 'uri:readme', fallbackUri: 'fallback:readme' },
		changelog: { uri: 'uri:changelog', fallbackUri: 'fallback:changlog' },
		download: { uri: 'uri:download', fallbackUri: 'fallback:download' },
		icon: { uri: 'uri:icon', fallbackUri: 'fallback:icon' },
		license: { uri: 'uri:license', fallbackUri: 'fallback:license' },
		repository: { uri: 'uri:repository', fallbackUri: 'fallback:repository' },
		coreTranslations: []
	}),
	aGalleryExtension('MockExtension2', {
		displayName: 'Mock Extension 2',
		version: '1.5',
		publisherId: 'mockPublisher2Id',
		publisher: 'mockPublisher2',
		publisherDisplayName: 'Mock Publisher 2',
		description: 'Mock Description',
		installCount: 1000,
		rating: 4,
		ratingCount: 100
	}, {
		dependencies: ['pub.1', 'pub.2'],
	}, {
		manifest: { uri: 'uri:manifest', fallbackUri: 'fallback:manifest' },
		readme: { uri: 'uri:readme', fallbackUri: 'fallback:readme' },
		changelog: { uri: 'uri:changelog', fallbackUri: 'fallback:changlog' },
		download: { uri: 'uri:download', fallbackUri: 'fallback:download' },
		icon: { uri: 'uri:icon', fallbackUri: 'fallback:icon' },
		license: { uri: 'uri:license', fallbackUri: 'fallback:license' },
		repository: { uri: 'uri:repository', fallbackUri: 'fallback:repository' },
		coreTranslations: []
	})
];

const mockExtensionLocal = [
	{
		type: ExtensionType.User,
		identifier: mockExtensionGallery[0].identifier,
		manifest: {
			name: mockExtensionGallery[0].name,
			publisher: mockExtensionGallery[0].publisher,
			version: mockExtensionGallery[0].version
		},
		metadata: null,
		path: 'somepath',
		readmeUrl: 'some readmeUrl',
		changelogUrl: 'some changelogUrl'
	},
	{
		type: ExtensionType.User,
		identifier: mockExtensionGallery[1].identifier,
		manifest: {
			name: mockExtensionGallery[1].name,
			publisher: mockExtensionGallery[1].publisher,
			version: mockExtensionGallery[1].version
		},
		metadata: null,
		path: 'somepath',
		readmeUrl: 'some readmeUrl',
		changelogUrl: 'some changelogUrl'
	}
];

const mockTestData = {
	recommendedExtensions: [
		'mockPublisher1.mockExtension1',
		'MOCKPUBLISHER2.mockextension2',
		'badlyformattedextension',
		'MOCKPUBLISHER2.mockextension2',
		'unknown.extension'
	],
	validRecommendedExtensions: [
		'mockPublisher1.mockExtension1',
		'MOCKPUBLISHER2.mockextension2'
	]
};

function aPage<T>(...objects: T[]): IPager<T> {
	return { firstPage: objects, total: objects.length, pageSize: objects.length, getPage: () => null! };
}

const noAssets: IGalleryExtensionAssets = {
	changelog: null,
	download: null!,
	icon: null!,
	license: null,
	manifest: null,
	readme: null,
	repository: null,
	coreTranslations: []
};

function aGalleryExtension(name: string, properties: any = {}, galleryExtensionProperties: any = {}, assets: IGalleryExtensionAssets = noAssets): IGalleryExtension {
	const galleryExtension = <IGalleryExtension>Object.create({});
	assign(galleryExtension, { name, publisher: 'pub', version: '1.0.0', properties: {}, assets: {} }, properties);
	assign(galleryExtension.properties, { dependencies: [] }, galleryExtensionProperties);
	assign(galleryExtension.assets, assets);
	galleryExtension.identifier = { id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name), uuid: uuid.generateUuid() };
	return <IGalleryExtension>galleryExtension;
}

suite.skip('ExtensionsTipsService Test', () => { // {{SQL CARBON EDIT}} skip suite
	let workspaceService: IWorkspaceContextService;
	let instantiationService: TestInstantiationService;
	let testConfigurationService: TestConfigurationService;
	let testObject: ExtensionTipsService;
	let parentResource: string;
	let installEvent: Emitter<InstallExtensionEvent>,
		didInstallEvent: Emitter<DidInstallExtensionEvent>,
		uninstallEvent: Emitter<IExtensionIdentifier>,
		didUninstallEvent: Emitter<DidUninstallExtensionEvent>;
	let prompted: boolean;
	let onModelAddedEvent: Emitter<ITextModel>;
	let experimentService: TestExperimentService;

	suiteSetup(() => {
		instantiationService = new TestInstantiationService();
		installEvent = new Emitter<InstallExtensionEvent>();
		didInstallEvent = new Emitter<DidInstallExtensionEvent>();
		uninstallEvent = new Emitter<IExtensionIdentifier>();
		didUninstallEvent = new Emitter<DidUninstallExtensionEvent>();
		instantiationService.stub(IExtensionGalleryService, ExtensionGalleryService);
		instantiationService.stub(ISharedProcessService, TestSharedProcessService);
		instantiationService.stub(ILifecycleService, new TestLifecycleService());
		testConfigurationService = new TestConfigurationService();
		instantiationService.stub(IConfigurationService, testConfigurationService);
		instantiationService.stub(INotificationService, new TestNotificationService());
		instantiationService.stub(IExtensionManagementService, ExtensionManagementService);
		instantiationService.stub(IExtensionManagementService, 'onInstallExtension', installEvent.event);
		instantiationService.stub(IExtensionManagementService, 'onDidInstallExtension', didInstallEvent.event);
		instantiationService.stub(IExtensionManagementService, 'onUninstallExtension', uninstallEvent.event);
		instantiationService.stub(IExtensionManagementService, 'onDidUninstallExtension', didUninstallEvent.event);
		instantiationService.stub(IExtensionEnablementService, new TestExtensionEnablementService(instantiationService));
		instantiationService.stub(ITelemetryService, NullTelemetryService);
		instantiationService.stub(IURLService, URLService);
		instantiationService.set(IProductService, {
			...productService,
			...{
				extensionTips: {
					'ms-vscode.csharp': '{**/*.cs,**/project.json,**/global.json,**/*.csproj,**/*.sln,**/appsettings.json}',
					'msjsdiag.debugger-for-chrome': '{**/*.ts,**/*.tsx**/*.js,**/*.jsx,**/*.es6,**/.babelrc}',
					'lukehoban.Go': '**/*.go'
				},
				extensionImportantTips: {
					'ms-python.python': {
						'name': 'Python',
						'pattern': '{**/*.py}'
					},
					'ms-vscode.PowerShell': {
						'name': 'PowerShell',
						'pattern': '{**/*.ps,**/*.ps1}'
					}
				}
			}
		});

		experimentService = instantiationService.createInstance(TestExperimentService);
		instantiationService.stub(IExperimentService, experimentService);

		onModelAddedEvent = new Emitter<ITextModel>();
	});

	suiteTeardown(() => {
		if (experimentService) {
			experimentService.dispose();
		}
	});

	setup(() => {
		instantiationService.stub(IEnvironmentService, <Partial<IEnvironmentService>>{});
		instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', []);
		instantiationService.stub(IExtensionGalleryService, 'isEnabled', true);
		instantiationService.stubPromise(IExtensionGalleryService, 'query', aPage<IGalleryExtension>(...mockExtensionGallery));

		prompted = false;

		class TestNotificationService2 extends TestNotificationService {
			public prompt(severity: Severity, message: string, choices: IPromptChoice[], options?: IPromptOptions) {
				prompted = true;
				return null!;
			}
		}

		instantiationService.stub(INotificationService, new TestNotificationService2());

		testConfigurationService.setUserConfiguration(ConfigurationKey, { ignoreRecommendations: false, showRecommendationsOnlyOnDemand: false });
		instantiationService.stub(IStorageService, <Partial<IStorageService>>{ get: (a: string, b: StorageScope, c?: string) => c, getBoolean: (a: string, b: StorageScope, c: boolean) => c, store: () => { } });
		instantiationService.stub(IModelService, <IModelService>{
			getModels(): any { return []; },
			onModelAdded: onModelAddedEvent.event
		});
	});

	teardown(done => {
		(<ExtensionTipsService>testObject).dispose();
		if (parentResource) {
			rimraf(parentResource, RimRafMode.MOVE).then(done, done);
		} else {
			done();
		}
	});

	function setUpFolderWorkspace(folderName: string, recommendedExtensions: string[], ignoredRecommendations: string[] = []): Promise<void> {
		const id = uuid.generateUuid();
		parentResource = path.join(os.tmpdir(), 'vsctests', id);
		return setUpFolder(folderName, parentResource, recommendedExtensions, ignoredRecommendations);
	}

	async function setUpFolder(folderName: string, parentDir: string, recommendedExtensions: string[], ignoredRecommendations: string[] = []): Promise<void> {
		const folderDir = path.join(parentDir, folderName);
		const workspaceSettingsDir = path.join(folderDir, '.vscode');
		await mkdirp(workspaceSettingsDir, 493);
		const configPath = path.join(workspaceSettingsDir, 'extensions.json');
		fs.writeFileSync(configPath, JSON.stringify({
			'recommendations': recommendedExtensions,
			'unwantedRecommendations': ignoredRecommendations,
		}, null, '\t'));

		const myWorkspace = testWorkspace(URI.from({ scheme: 'file', path: folderDir }));
		workspaceService = new TestContextService(myWorkspace);
		instantiationService.stub(IWorkspaceContextService, workspaceService);
		const fileService = new FileService(new NullLogService());
		fileService.registerProvider(Schemas.file, new DiskFileSystemProvider(new NullLogService()));
		instantiationService.stub(IFileService, fileService);
	}

	function testNoPromptForValidRecommendations(recommendations: string[]) {
		return setUpFolderWorkspace('myFolder', recommendations).then(() => {
			testObject = instantiationService.createInstance(ExtensionTipsService);
			return testObject.loadWorkspaceConfigPromise.then(() => {
				assert.equal(Object.keys(testObject.getAllRecommendationsWithReason()).length, recommendations.length);
				assert.ok(!prompted);
			});
		});
	}

	function testNoPromptOrRecommendationsForValidRecommendations(recommendations: string[]) {
		return setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions).then(() => {
			testObject = instantiationService.createInstance(ExtensionTipsService);
			assert.equal(!testObject.loadWorkspaceConfigPromise, true);
			assert.ok(!prompted);

			return testObject.getWorkspaceRecommendations().then(() => {
				assert.equal(Object.keys(testObject.getAllRecommendationsWithReason()).length, 0);
				assert.ok(!prompted);
			});
		});
	}

	test('ExtensionTipsService: No Prompt for valid workspace recommendations when galleryService is absent', () => {
		const galleryQuerySpy = sinon.spy();
		instantiationService.stub(IExtensionGalleryService, { query: galleryQuerySpy, isEnabled: () => false });

		return testNoPromptOrRecommendationsForValidRecommendations(mockTestData.validRecommendedExtensions)
			.then(() => assert.ok(galleryQuerySpy.notCalled));
	});

	test('ExtensionTipsService: No Prompt for valid workspace recommendations during extension development', () => {
		instantiationService.stub(IEnvironmentService, { extensionDevelopmentLocationURI: [URI.file('/folder/file')] });
		return testNoPromptOrRecommendationsForValidRecommendations(mockTestData.validRecommendedExtensions);
	});

	test('ExtensionTipsService: No workspace recommendations or prompts when extensions.json has empty array', () => {
		return testNoPromptForValidRecommendations([]);
	});

	test('ExtensionTipsService: Prompt for valid workspace recommendations', () => {
		return setUpFolderWorkspace('myFolder', mockTestData.recommendedExtensions).then(() => {
			testObject = instantiationService.createInstance(ExtensionTipsService);
			return testObject.loadWorkspaceConfigPromise.then(() => {
				const recommendations = Object.keys(testObject.getAllRecommendationsWithReason());

				assert.equal(recommendations.length, mockTestData.validRecommendedExtensions.length);
				mockTestData.validRecommendedExtensions.forEach(x => {
					assert.equal(recommendations.indexOf(x.toLowerCase()) > -1, true);
				});

				assert.ok(prompted);
			});
		});
	});

	test('ExtensionTipsService: No Prompt for valid workspace recommendations if they are already installed', () => {
		instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', mockExtensionLocal);
		return testNoPromptForValidRecommendations(mockTestData.validRecommendedExtensions);
	});

	test('ExtensionTipsService: No Prompt for valid workspace recommendations with casing mismatch if they are already installed', () => {
		instantiationService.stubPromise(IExtensionManagementService, 'getInstalled', mockExtensionLocal);
		return testNoPromptForValidRecommendations(mockTestData.validRecommendedExtensions.map(x => x.toUpperCase()));
	});

	test('ExtensionTipsService: No Prompt for valid workspace recommendations if ignoreRecommendations is set', () => {
		testConfigurationService.setUserConfiguration(ConfigurationKey, { ignoreRecommendations: true });
		return testNoPromptForValidRecommendations(mockTestData.validRecommendedExtensions);
	});

	test('ExtensionTipsService: No Prompt for valid workspace recommendations if showRecommendationsOnlyOnDemand is set', () => {
		testConfigurationService.setUserConfiguration(ConfigurationKey, { showRecommendationsOnlyOnDemand: true });
		return setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions).then(() => {
			testObject = instantiationService.createInstance(ExtensionTipsService);
			return testObject.loadWorkspaceConfigPromise.then(() => {
				assert.equal(Object.keys(testObject.getAllRecommendationsWithReason()).length, 0);
				assert.ok(!prompted);
			});
		});
	});

	test('ExtensionTipsService: No Prompt for valid workspace recommendations if ignoreRecommendations is set for current workspace', () => {
		instantiationService.stub(IStorageService, <Partial<IStorageService>>{ get: (a: string, b: StorageScope, c?: string) => c, getBoolean: (a: string, b: StorageScope, c?: boolean) => a === 'extensionsAssistant/workspaceRecommendationsIgnore' || c });
		return testNoPromptForValidRecommendations(mockTestData.validRecommendedExtensions);
	});

	test('ExtensionTipsService: No Recommendations of globally ignored recommendations', () => {
		const storageGetterStub = (a: string, _: StorageScope, c?: string) => {
			const storedRecommendations = '["ms-vscode.csharp", "ms-python.python", "ms-vscode.vscode-typescript-tslint-plugin"]';
			const ignoredRecommendations = '["ms-vscode.csharp", "mockpublisher2.mockextension2"]'; // ignore a stored recommendation and a workspace recommendation.
			if (a === 'extensionsAssistant/recommendations') { return storedRecommendations; }
			if (a === 'extensionsAssistant/ignored_recommendations') { return ignoredRecommendations; }
			return c;
		};

		instantiationService.stub(IStorageService, <Partial<IStorageService>>{
			get: storageGetterStub,
			getBoolean: (a: string, _: StorageScope, c?: boolean) => a === 'extensionsAssistant/workspaceRecommendationsIgnore' || c
		});

		return setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions).then(() => {
			testObject = instantiationService.createInstance(ExtensionTipsService);
			return testObject.loadWorkspaceConfigPromise.then(() => {
				const recommendations = testObject.getAllRecommendationsWithReason();
				assert.ok(!recommendations['ms-vscode.csharp']); // stored recommendation that has been globally ignored
				assert.ok(recommendations['ms-python.python']); // stored recommendation
				assert.ok(recommendations['mockpublisher1.mockextension1']); // workspace recommendation
				assert.ok(!recommendations['mockpublisher2.mockextension2']); // workspace recommendation that has been globally ignored
			});
		});
	});

	test('ExtensionTipsService: No Recommendations of workspace ignored recommendations', () => {
		const ignoredRecommendations = ['ms-vscode.csharp', 'mockpublisher2.mockextension2']; // ignore a stored recommendation and a workspace recommendation.
		const storedRecommendations = '["ms-vscode.csharp", "ms-python.python"]';
		instantiationService.stub(IStorageService, <Partial<IStorageService>>{
			get: (a: string, b: StorageScope, c?: string) => a === 'extensionsAssistant/recommendations' ? storedRecommendations : c,
			getBoolean: (a: string, _: StorageScope, c?: boolean) => a === 'extensionsAssistant/workspaceRecommendationsIgnore' || c
		});

		return setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions, ignoredRecommendations).then(() => {
			testObject = instantiationService.createInstance(ExtensionTipsService);
			return testObject.loadWorkspaceConfigPromise.then(() => {
				const recommendations = testObject.getAllRecommendationsWithReason();
				assert.ok(!recommendations['ms-vscode.csharp']); // stored recommendation that has been workspace ignored
				assert.ok(recommendations['ms-python.python']); // stored recommendation
				assert.ok(recommendations['mockpublisher1.mockextension1']); // workspace recommendation
				assert.ok(!recommendations['mockpublisher2.mockextension2']); // workspace recommendation that has been workspace ignored
			});
		});
	});

	test('ExtensionTipsService: Able to retrieve collection of all ignored recommendations', () => {

		const storageGetterStub = (a: string, _: StorageScope, c?: string) => {
			const storedRecommendations = '["ms-vscode.csharp", "ms-python.python"]';
			const globallyIgnoredRecommendations = '["mockpublisher2.mockextension2"]'; // ignore a workspace recommendation.
			if (a === 'extensionsAssistant/recommendations') { return storedRecommendations; }
			if (a === 'extensionsAssistant/ignored_recommendations') { return globallyIgnoredRecommendations; }
			return c;
		};

		const workspaceIgnoredRecommendations = ['ms-vscode.csharp']; // ignore a stored recommendation and a workspace recommendation.
		instantiationService.stub(IStorageService, <Partial<IStorageService>>{
			get: storageGetterStub,
			getBoolean: (a: string, _: StorageScope, c?: boolean) => a === 'extensionsAssistant/workspaceRecommendationsIgnore' || c
		});

		return setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions, workspaceIgnoredRecommendations).then(() => {
			testObject = instantiationService.createInstance(ExtensionTipsService);
			return testObject.loadWorkspaceConfigPromise.then(() => {
				const recommendations = testObject.getAllRecommendationsWithReason();
				assert.ok(recommendations['ms-python.python']);

				assert.ok(!recommendations['mockpublisher2.mockextension2']);
				assert.ok(!recommendations['ms-vscode.csharp']);
			});
		});
	});

	test('ExtensionTipsService: Able to dynamically ignore/unignore global recommendations', () => {
		const storageGetterStub = (a: string, _: StorageScope, c?: string) => {
			const storedRecommendations = '["ms-vscode.csharp", "ms-python.python"]';
			const globallyIgnoredRecommendations = '["mockpublisher2.mockextension2"]'; // ignore a workspace recommendation.
			if (a === 'extensionsAssistant/recommendations') { return storedRecommendations; }
			if (a === 'extensionsAssistant/ignored_recommendations') { return globallyIgnoredRecommendations; }
			return c;
		};

		instantiationService.stub(IStorageService, <Partial<IStorageService>>{
			get: storageGetterStub,
			store: () => { },
			getBoolean: (a: string, _: StorageScope, c?: boolean) => a === 'extensionsAssistant/workspaceRecommendationsIgnore' || c
		});

		return setUpFolderWorkspace('myFolder', mockTestData.validRecommendedExtensions).then(() => {
			testObject = instantiationService.createInstance(ExtensionTipsService);
			return testObject.loadWorkspaceConfigPromise.then(() => {
				const recommendations = testObject.getAllRecommendationsWithReason();
				assert.ok(recommendations['ms-python.python']);
				assert.ok(recommendations['mockpublisher1.mockextension1']);

				assert.ok(!recommendations['mockpublisher2.mockextension2']);

				return testObject.toggleIgnoredRecommendation('mockpublisher1.mockextension1', true);
			}).then(() => {
				const recommendations = testObject.getAllRecommendationsWithReason();
				assert.ok(recommendations['ms-python.python']);

				assert.ok(!recommendations['mockpublisher1.mockextension1']);
				assert.ok(!recommendations['mockpublisher2.mockextension2']);

				return testObject.toggleIgnoredRecommendation('mockpublisher1.mockextension1', false);
			}).then(() => {
				const recommendations = testObject.getAllRecommendationsWithReason();
				assert.ok(recommendations['ms-python.python']);

				assert.ok(recommendations['mockpublisher1.mockextension1']);
				assert.ok(!recommendations['mockpublisher2.mockextension2']);
			});
		});
	});

	test('test global extensions are modified and recommendation change event is fired when an extension is ignored', () => {
		const storageSetterTarget = sinon.spy();
		const changeHandlerTarget = sinon.spy();
		const ignoredExtensionId = 'Some.Extension';
		instantiationService.stub(IStorageService, <any>{ // {{SQL CARBON EDIT}} strict-null-checks?
			get: (a: string, b: StorageScope, c?: boolean) => a === 'extensionsAssistant/ignored_recommendations' ? '["ms-vscode.vscode"]' : c,
			store: (...args: any[]) => {
				storageSetterTarget(...args);
			}
		});

		return setUpFolderWorkspace('myFolder', []).then(() => {
			testObject = instantiationService.createInstance(ExtensionTipsService);
			testObject.onRecommendationChange(changeHandlerTarget);
			testObject.toggleIgnoredRecommendation(ignoredExtensionId, true);

			assert.ok(changeHandlerTarget.calledOnce);
			assert.ok(changeHandlerTarget.getCall(0).calledWithMatch({ extensionId: 'Some.Extension', isRecommended: false }));
			assert.ok(storageSetterTarget.calledWithExactly('extensionsAssistant/ignored_recommendations', `["ms-vscode.vscode","${ignoredExtensionId.toLowerCase()}"]`, StorageScope.GLOBAL));
		});
	});

	test('ExtensionTipsService: Get file based recommendations from storage (old format)', () => {
		const storedRecommendations = '["ms-vscode.csharp", "ms-python.python", "ms-vscode.vscode-typescript-tslint-plugin"]';
		instantiationService.stub(IStorageService, <Partial<IStorageService>>{ get: (a: string, b: StorageScope, c?: string) => a === 'extensionsAssistant/recommendations' ? storedRecommendations : c });

		return setUpFolderWorkspace('myFolder', []).then(() => {
			testObject = instantiationService.createInstance(ExtensionTipsService);
			return testObject.loadWorkspaceConfigPromise.then(() => {
				const recommendations = testObject.getFileBasedRecommendations();
				assert.equal(recommendations.length, 2);
				assert.ok(recommendations.some(({ extensionId }) => extensionId === 'ms-vscode.csharp')); // stored recommendation that exists in product.extensionTips
				assert.ok(recommendations.some(({ extensionId }) => extensionId === 'ms-python.python')); // stored recommendation that exists in product.extensionImportantTips
				assert.ok(recommendations.every(({ extensionId }) => extensionId !== 'ms-vscode.vscode-typescript-tslint-plugin')); // stored recommendation that is no longer in neither product.extensionTips nor product.extensionImportantTips
			});
		});
	});

	test('ExtensionTipsService: Get file based recommendations from storage (new format)', () => {
		const milliSecondsInADay = 1000 * 60 * 60 * 24;
		const now = Date.now();
		const tenDaysOld = 10 * milliSecondsInADay;
		const storedRecommendations = `{"ms-vscode.csharp": ${now}, "ms-python.python": ${now}, "ms-vscode.vscode-typescript-tslint-plugin": ${now}, "lukehoban.Go": ${tenDaysOld}}`;
		instantiationService.stub(IStorageService, <Partial<IStorageService>>{ get: (a: string, b: StorageScope, c?: string) => a === 'extensionsAssistant/recommendations' ? storedRecommendations : c });

		return setUpFolderWorkspace('myFolder', []).then(() => {
			testObject = instantiationService.createInstance(ExtensionTipsService);
			return testObject.loadWorkspaceConfigPromise.then(() => {
				const recommendations = testObject.getFileBasedRecommendations();
				assert.equal(recommendations.length, 2);
				assert.ok(recommendations.some(({ extensionId }) => extensionId === 'ms-vscode.csharp')); // stored recommendation that exists in product.extensionTips
				assert.ok(recommendations.some(({ extensionId }) => extensionId === 'ms-python.python')); // stored recommendation that exists in product.extensionImportantTips
				assert.ok(recommendations.every(({ extensionId }) => extensionId !== 'ms-vscode.vscode-typescript-tslint-plugin')); // stored recommendation that is no longer in neither product.extensionTips nor product.extensionImportantTips
				assert.ok(recommendations.every(({ extensionId }) => extensionId !== 'lukehoban.Go')); //stored recommendation that is older than a week
			});
		});
	});
});
