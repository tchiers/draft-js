/**
 * Created by todd on 6/29/17.
 */
/**
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule TableDraftDecorator
 * @typechecks
 * @flow
 */

'use strict';

var Immutable = require('immutable');

import type ContentBlock from 'ContentBlock';
import type {DraftDecorator} from 'DraftDecorator';
import type ContentState from 'ContentState';

var {List} = Immutable;

var DELIMITER = '.';

class TableDraftDecorator {
    constructor(decorator: ?DraftDecorator) {
        this._decorator = decorator;
    }

    getDecorations(
        block: ContentBlock,
        contentState: ContentState,
    ): List<?string> {
        var decorations = this._decorator ?
            this._decorator.getDecorations(block, contentState).toArray() :
            Array(block.getText().length).fill(null);

        for (let ii = 0; ii < decorations.length; ii++) {
            let type = testEntityType(block, contentState, ii);
            if (type) {
                decorations[ii] = (decorations[ii] ? decorations[ii] : "") + "|" + type;
            }
        }

        return List(decorations);
    }

    getComponentForKey(key: string): Function {
        const keys = key.split('|');
        return this._decorator ?
            this._decorator.getComponentForKey(keys[0]) :
            null;
    }

    getPropsForKey(key: string): ?Object {
        const keys = key.split('|');
        return this._decorator && this._decorator.getPropsForKey(keys[0]);
    }

}

function testEntityType(block, contentState, ii) {
    const entityKey = block.getEntityAt(ii);
    if (entityKey === null) return false;
    const type = contentState.getEntity(entityKey).getType();
    if (type == 'TABLE-ROW' || type =='TABLE-CELL') return entityKey;
}

module.exports = TableDraftDecorator;
