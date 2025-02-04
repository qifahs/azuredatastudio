/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/base/common/uri';
import { ITextEditorOptions } from 'vs/platform/editor/common/editor';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IEditor } from 'vs/workbench/common/editor';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';


export const ICustomEditorService = createDecorator<ICustomEditorService>('customEditorService');

export interface ICustomEditorService {
	_serviceBrand: any;

	getContributedCustomEditors(resource: URI): readonly CustomEditorInfo[];
	getUserConfiguredCustomEditors(resource: URI): readonly CustomEditorInfo[];

	openWith(resource: URI, customEditorViewType: string, options?: ITextEditorOptions, group?: IEditorGroup): Promise<IEditor | undefined>;
	promptOpenWith(resource: URI, options?: ITextEditorOptions, group?: IEditorGroup): Promise<IEditor | undefined>;
}

export const enum CustomEditorDiscretion {
	default = 'default',
	option = 'option',
}

export interface CustomEditorSelector {
	readonly scheme?: string;
	readonly filenamePattern?: string;
}

export interface CustomEditorInfo {
	readonly id: string;
	readonly displayName: string;
	readonly discretion: CustomEditorDiscretion;
	readonly selector: readonly CustomEditorSelector[];
}
