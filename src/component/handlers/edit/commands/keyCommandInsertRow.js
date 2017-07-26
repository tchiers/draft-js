/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule keyCommandInsertRow
 * @flow
 */

'use strict';

var DraftModifier = require('DraftModifier');
var EditorState = require('EditorState');
var keyCommandInsertEntity = require('keyCommandInsertEntity');

function keyCommandInsertRow(editorState: EditorState, insertionPoint): EditorState {
  const cols = findNumCols(editorState);

  var intermediate = editorState;
  for (let i = 0; i < cols; i++) {
    intermediate = keyCommandInsertEntity(intermediate, insertionPoint, "TABLE-CELL", "<cell>");
  }
  return keyCommandInsertEntity(intermediate, insertionPoint, "TABLE-ROW", "\n<row>");
}

function findNumCols(editorState: EditorState) {
    let selection = editorState.getSelection();
    let startKey = selection.getStartKey();
    let contentState = editorState.getCurrentContent();
    let contentBlock = contentState.getBlockForKey(startKey);
    let i = 0, count = 1, armed = false, inCellEntity = false;
    let len = contentBlock.getLength();
    let ent;
    while (i < len){
        ent = contentBlock.getEntityAt(i);
        if (ent) {
            ent = contentState.getEntity(ent).getType();
            if (armed) {
                if (ent == "TABLE-ROW") return count;
                else if (ent == "TABLE-CELL") {
                    if (!inCellEntity) {
                        inCellEntity = true;
                        count++;
                    }
                } else {
                    inCellEntity = false;
                }
            } else {
              if (ent !== "TABLE-ROW" && ent !== "TABLE-CELL") {
                  armed = true;
                  inCellEntity = false;
              }
            }
        } else {
          armed = true;
          inCellEntity = false;
        }
        i++;
    }
}


module.exports = keyCommandInsertRow;
