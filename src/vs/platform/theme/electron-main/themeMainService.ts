/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isWindows, isMacintosh } from 'vs/base/common/platform';
import { systemPreferences, ipcMain as ipc } from 'electron';
import { IStateService } from 'vs/platform/state/common/state';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

const DEFAULT_BG_LIGHT = '#FFFFFF';
const DEFAULT_BG_DARK = '#1E1E1E';
const DEFAULT_BG_HC_BLACK = '#000000';

const THEME_STORAGE_KEY = 'theme';
const THEME_BG_STORAGE_KEY = 'themeBackground';

export const IThemeMainService = createDecorator<IThemeMainService>('themeMainService');

export interface IThemeMainService {
	_serviceBrand: undefined;

	getBackgroundColor(): string;
}

export class ThemeMainService implements IThemeMainService {

	_serviceBrand: undefined;

	constructor(@IStateService private stateService: IStateService) {
		ipc.on('vscode:changeColorTheme', (e: Event, windowId: number, broadcast: string) => {
			// Theme changes
			if (typeof broadcast === 'string') {
				this.storeBackgroundColor(JSON.parse(broadcast));
			}
		});
	}

	private storeBackgroundColor(data: { baseTheme: string, background: string }): void {
		this.stateService.setItem(THEME_STORAGE_KEY, data.baseTheme);
		this.stateService.setItem(THEME_BG_STORAGE_KEY, data.background);
	}

	public getBackgroundColor(): string {
		if (isWindows && systemPreferences.isInvertedColorScheme()) {
			return DEFAULT_BG_HC_BLACK;
		}

		let background = this.stateService.getItem<string | null>(THEME_BG_STORAGE_KEY, null);
		if (!background) {
			let baseTheme: string;
			if (isWindows && systemPreferences.isInvertedColorScheme()) {
				baseTheme = 'hc-black';
			} else {
				baseTheme = this.stateService.getItem<string>(THEME_STORAGE_KEY, 'vs-dark').split(' ')[0];
			}

			background = (baseTheme === 'hc-black') ? DEFAULT_BG_HC_BLACK : (baseTheme === 'vs' ? DEFAULT_BG_LIGHT : DEFAULT_BG_DARK);
		}

		if (isMacintosh && background.toUpperCase() === DEFAULT_BG_DARK) {
			background = '#171717'; // https://github.com/electron/electron/issues/5150
		}

		return background;
	}
}