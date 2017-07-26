/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule keyCommandInsertEntity
 * @flow
 */

'use strict';

var DraftModifier = require('DraftModifier');
var EditorState = require('EditorState');

function keyCommandInsertEntity(editorState: EditorState, insertionPoint, entityType, text): EditorState {
    var contentState = editorState.getCurrentContent();

  contentState = contentState.createEntity(entityType, 'IMMUTABLE', {});
  const key = contentState.getLastCreatedEntityKey();
  contentState = DraftModifier.insertText(
    contentState,
    insertionPoint,
    text,
      null,
      key
  );
  return EditorState.push(editorState, contentState, 'insert-characters');
}

module.exports = keyCommandInsertEntity;
