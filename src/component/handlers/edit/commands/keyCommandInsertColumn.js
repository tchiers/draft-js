/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule keyCommandInsertColumn
 * @flow
 */

'use strict';

var DraftModifier = require('DraftModifier');
var EditorState = require('EditorState');
var keyCommandInsertEntity = require('keyCommandInsertEntity');

function keyCommandInsertColumn(editorState: EditorState): EditorState {
  const col = findColNum(editorState);
    let selection = editorState.getSelection();
    let startKey = selection.getStartKey();
    let contentState = editorState.getCurrentContent();
    let contentBlock = contentState.getBlockForKey(startKey);
    let len = contentBlock.getLength();
    let ent, armed;
    let i = 0, count = 0, inCellEntity = false;


    var intermediate = editorState;

    const insert = function (i) {
        selection = selection.merge({
            anchorKey: startKey,
            anchorOffset: i,
            focusKey: startKey,
            focusOffset: i,
            isBackward: false,
        });
        intermediate = keyCommandInsertEntity(intermediate, selection , "TABLE-CELL", "<cell>");
        contentBlock = intermediate.getCurrentContent().getBlockForKey(startKey);
        len = contentBlock.getLength();
    };

  while (i < len) {
      ent = contentBlock.getEntityAt(i);
      if (ent) {
          ent = contentState.getEntity(ent).getType();
          if (ent == "TABLE-ROW") {
              if (armed && count == col) insert(i);
              count = 0;
              armed = false;
          }
          else if (ent == "TABLE-CELL") {
              if (!inCellEntity) {
                  inCellEntity = true;
                  if (armed) {
                      if (count == col) insert(i);
                      count++;
                  }
              }
          } else {
              inCellEntity = false;
              armed = true;
          }
      } else {
          inCellEntity = false;
          armed = true;
      }
      i++;
  }
  return intermediate;
}

function findColNum(editorState: EditorState) {
    let selection = editorState.getSelection();
    let startKey = selection.getStartKey();
    let contentState = editorState.getCurrentContent();
    let contentBlock = contentState.getBlockForKey(startKey);
    let i = selection.getAnchorOffset();
    let count = -1, inCellEntity = false;
    let ent;
    while (i > 0){
        ent = contentBlock.getEntityAt(i);
        if (ent) {
            ent = contentState.getEntity(ent).getType();
                if (ent == "TABLE-ROW") return count + (inCellEntity ? 0 : 1);
                else if (ent == "TABLE-CELL") {
                    if (!inCellEntity) {
                        inCellEntity = true;
                        count++;
                    }
                } else {
                    inCellEntity = false;
                }
        } else {
          inCellEntity = false;
        }
        i--;
    }
}


module.exports = keyCommandInsertColumn;
