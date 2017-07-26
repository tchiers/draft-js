/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule DraftEditorBlock.react
 * @typechecks
 * @flow
 */

'use strict';

import type {BidiDirection} from 'UnicodeBidiDirection';
import type ContentBlock from 'ContentBlock';
import type ContentState from 'ContentState';
import type {DraftDecoratorType} from 'DraftDecoratorType';
import type {List} from 'immutable';
import type SelectionState from 'SelectionState';

const DraftEditorLeaf = require('DraftEditorLeaf.react');
const DraftEditorBlock = require('DraftEditorBlock.react');
const DraftOffsetKey = require('DraftOffsetKey');
const React = require('React');
const ReactDOM = require('ReactDOM');
const Scroll = require('Scroll');

const Style = require('Style');
const UnicodeBidi = require('UnicodeBidi');
const UnicodeBidiDirection = require('UnicodeBidiDirection');

const cx = require('cx');
const getElementPosition = require('getElementPosition');
const getScrollPosition = require('getScrollPosition');
const getViewportDimensions = require('getViewportDimensions');
const invariant = require('invariant');
const nullthrows = require('nullthrows');

const SCROLL_BUFFER = 10;

var Immutable = require('immutable');
var {
    OrderedSet,
} = Immutable;

const EMPTY_SET = OrderedSet();

type Props = {
  contentState: ContentState,
  block: ContentBlock,
  customStyleMap: Object,
  customStyleFn: Function,
  tree: List<any>,
  selection: SelectionState,
  decorator: DraftDecoratorType,
  forceSelection: boolean,
  direction: BidiDirection,
  blockProps?: Object,
  startIndent?: boolean,
  blockStyleFn: Function,
};

/**
 * The default block renderer for a `DraftEditor` component.
 *
 * A `DraftEditorBlock` is able to render a given `ContentBlock` to its
 * appropriate decorator and inline style components.
 */
class DraftEditorTable extends DraftEditorBlock {
  _renderChildren(): Array<React.Element<any>> {
    var block = this.props.block;
    var blockKey = block.getKey();
    var text = block.getText();
    var lastLeafSet = this.props.tree.size - 1;
    var hasSelection = isBlockOnSelectionEdge(this.props.selection, blockKey);

    var lastOffsetKey;

    var validateLastCell = (accum, ii, jj, leaf) => {
      let row=accum.rows[accum.rows.length-1];
      if (!row) return;
      let cell = row[row.length-1];
      if (!cell || cell.length) return;

      var offsetKey = DraftOffsetKey.encode(blockKey, ii, jj);

      cell.push(
          <DraftEditorLeaf
              key={offsetKey}
              offsetKey={offsetKey}
              block={block}
              start={leaf.get('start')}
              selection={hasSelection ? this.props.selection : undefined}
              forceSelection={this.props.forceSelection}
              text={''}
              styleSet={EMPTY_SET}
              customStyleMap={this.props.customStyleMap}
              customStyleFn={this.props.customStyleFn}
              isLast={false}
          />

      )
    }

    //reduce to array (rows) of arrays (cells)
    return this.props.tree.reduce((accum, leafSet, ii) => {
      var leavesForLeafSet = leafSet.get('leaves');
      var lastLeaf = leavesForLeafSet.size - 1;
      var entity = block.getEntityAt(leafSet.get('start'));
      if (entity) {
        var entityType = this.props.contentState.getEntity(entity).getType();
      }

      //if it's a table marker, the whole leafSet is suppressed.
      if (entityType == 'TABLE-ROW') {
        //start a new row
          validateLastCell(accum, ii, lastLeaf, leavesForLeafSet.last()); //provide current ii, jj, so inserting from offset 0 works correctly
          accum.rows.push([]);
          return accum;
      }
      //implicit first row?
      if (!accum.rows.length) accum.rows.push([]);
      var row = accum.rows[accum.rows.length-1];
      if (entityType == 'TABLE-CELL') {
        //start a new cell
          validateLastCell(accum, ii, lastLeaf, leavesForLeafSet.last()); //provide current ii, jj, so inserting from offset 0 works correctly
          row.push([]);
          return accum;
      }
      //implicit first cell?
      if (!row.length) row.push([]);
      var cell = row[row.length-1];

      //otherwise, the leaves are cell contents

      var leaves = leavesForLeafSet.map((leaf, jj) => {
        var offsetKey = DraftOffsetKey.encode(blockKey, ii, jj);
        var start = leaf.get('start');
        var end = leaf.get('end');
        return (
          <DraftEditorLeaf
            key={offsetKey}
            offsetKey={offsetKey}
            block={block}
            start={start}
            selection={hasSelection ? this.props.selection : undefined}
            forceSelection={this.props.forceSelection}
            text={text.slice(start, end)}
            styleSet={block.getInlineStyleAt(start)}
            customStyleMap={this.props.customStyleMap}
            customStyleFn={this.props.customStyleFn}
            isLast={ii === lastLeafSet && jj === lastLeaf}
          />
        );
      }).toArray();

      var decoratorKey = leafSet.get('decoratorKey');
      if (decoratorKey == null) {
        cell.push(leaves);
        return accum;
      }

      if (!this.props.decorator) {
          cell.push(leaves);
          return accum;
      }

      var decorator = nullthrows(this.props.decorator);

      var DecoratorComponent = decorator.getComponentForKey(decoratorKey);
      if (!DecoratorComponent) {
          cell.push(leaves);
          return accum;
      }

      var decoratorProps = decorator.getPropsForKey(decoratorKey);
      var decoratorOffsetKey = DraftOffsetKey.encode(blockKey, ii, 0);
      var decoratedText = text.slice(
        leavesForLeafSet.first().get('start'),
        leavesForLeafSet.last().get('end'),
      );

      // Resetting dir to the same value on a child node makes Chrome/Firefox
      // confused on cursor movement. See http://jsfiddle.net/d157kLck/3/
      var dir = UnicodeBidiDirection.getHTMLDirIfDifferent(
        UnicodeBidi.getDirection(decoratedText),
        this.props.direction,
      );

      cell.push (
        <DecoratorComponent
          {...decoratorProps}
          contentState={this.props.contentState}
          decoratedText={decoratedText}
          dir={dir}
          key={decoratorOffsetKey}
          entityKey={block.getEntityAt(leafSet.get('start'))}
          offsetKey={decoratorOffsetKey}>
          {leaves}
        </DecoratorComponent>
      );
      return accum;
    }, {rows: []});
  }

  render(): React.Element<any> {
    const {direction, offsetKey} = this.props;
    const className = cx({
      'public/DraftStyleDefault/block': true,
      'public/DraftStyleDefault/ltr': direction === 'LTR',
      'public/DraftStyleDefault/rtl': direction === 'RTL',
    });

    const rows = this._renderChildren().rows;


    return (
      <tbody data-offset-key={offsetKey} className={className}>
          {rows.map((row, ridx) => {
            return <tr key={ridx}>
                {row.map((cell, cidx) => {
                  const CellType = ridx == 0 ? "th" : "td";
                  return <CellType key={`${ridx}-${cidx}`}>
                      {cell}
                  </CellType>
                })}
            </tr>
          })}
      </tbody>
    );
  }
}

/**
 * Return whether a block overlaps with either edge of the `SelectionState`.
 */
function isBlockOnSelectionEdge(
  selection: SelectionState,
  key: string,
): boolean {
  return (
    selection.getAnchorKey() === key ||
    selection.getFocusKey() === key
  );
}

module.exports = DraftEditorTable;
