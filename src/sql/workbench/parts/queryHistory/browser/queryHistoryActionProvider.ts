/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { QueryHistoryNode } from 'sql/platform/queryHistory/common/queryHistoryNode';
import { DeleteAction, OpenQueryAction, RunQueryAction } from 'sql/workbench/parts/queryHistory/browser/queryHistoryActions';
import { ITree } from 'vs/base/parts/tree/browser/tree';
import { ContributableActionProvider } from 'vs/workbench/browser/actions';
import { IAction } from 'vs/base/common/actions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { QueryHistoryView } from 'sql/workbench/parts/queryHistory/browser/queryHistoryView';

/**
 *  Provides query history actions
 */
export class QueryHistoryActionProvider extends ContributableActionProvider {

	constructor(
		private _queryHistoryView: QueryHistoryView,
		@IInstantiationService private _instantiationService: IInstantiationService
	) {
		super();
	}

	public hasActions(tree: ITree, element: any): boolean {
		return element instanceof QueryHistoryNode;
	}

	/**
	 * Return actions given an element in the tree
	 */
	public getActions(tree: ITree, element: any): IAction[] {
		if (element instanceof QueryHistoryNode) {
			return this.getQueryHistoryActions(tree, element);
		}
		return [];
	}

	public hasSecondaryActions(tree: ITree, element: any): boolean {
		return false;
	}

	/**
	 * Return actions for query history task
	 */
	public getQueryHistoryActions(tree: ITree, element: QueryHistoryNode): IAction[] {
		const actions: IAction[] = [];
		if (element.queryText && element.queryText !== '') {
			actions.push(this._instantiationService.createInstance(OpenQueryAction, OpenQueryAction.ID, OpenQueryAction.LABEL));
			actions.push(this._instantiationService.createInstance(RunQueryAction, RunQueryAction.ID, RunQueryAction.LABEL));
		}
		actions.push(this._instantiationService.createInstance(DeleteAction, DeleteAction.ID, DeleteAction.LABEL, this._queryHistoryView));
		return actions;
	}
}
