
import React from 'react';
import EpicComponent from 'epic-component';
import {ViewerResponsive, ViewerHelper} from 'react-svg-pan-zoom';

import {getIdent, getNumber, getList, viewVariable, readArray2D, renderValue} from './utils';

export const Array2D = EpicComponent(self => {

  const textLineHeight = 18;
  const textBaseline = 5; // from bottom
  const strikeThroughHeight = 5; // from baseline
  const textArrowHeight = 4; // from baseline to arrow point
  const textArrowSpacing = 2;
  const arrowSize = 15;
  const cellWidth = 60;  // to fit a negative double
  const cellHeight = 2 * textLineHeight + 3;
  const gridLeft = textLineHeight * 4 + arrowSize;
  const gridTop = textLineHeight * 3 + arrowSize;
  const gridBorderLeft = 5;
  const gridBorderTop = 5;
  const gridStroke = "#777";
  const gridStrokeWidth = "1";
  const colNumWidth = 20;
  const cursorBgOpacity = "0.4";


  // left offset: big enough to fit a cursor with 10 characters
  // top offset: 2 line (cursors) + arrow + 1 line (column index)
  // directive named argument to set view height

  const extractView = function () {
    const {directive, controls, frames, context} = self.props;
    const {core} = context;
    // Positional arguments: [varName]
    // Named arguments: {rowCursor, colCursors}
    const {byName, byPos} = directive;
    const varName = getIdent(byPos[0]);
    const rowCursors = getList(byName.rowCursors, []).map(getIdent);
    const colCursors = getList(byName.colCursors, []).map(getIdent);
    const height = getNumber(byName.height, 'auto');
    // Look for the variable in the topmost frame.
    // TODO: look in globals if frames.length === 0
    const frame = frames[0];
    const localMap = frame.get('localMap');
    if (!localMap.has(varName)) {
      return {error: <p>{varName}{" not in scope"}</p>};
    }
    const {type, ref} = localMap.get(varName);
    // Expect an array of array declaration.
    if (type.kind !== 'array' || type.elem.kind !== 'array') {
      return {error: <p>{"value is not a 2D array"}</p>};
    }
    const rows = readArray2D(core, type, ref.address);
    // Inspect cursors.
    const rowCount = type.count, colCount = type.elem.count;
    const rowInfoMap = [], colInfoMap = [];
    rowCursors.forEach(cursorName =>
      readCursor(cursorName, rowCount, localMap, core, rowInfoMap));
    colCursors.forEach(cursorName =>
      readCursor(cursorName, colCount, localMap, core, colInfoMap));
    return {rows, rowCount, colCount, rowInfoMap, colInfoMap, height};
  };

  const readCursor = function (cursorName, elemCount, localMap, core, infoMap) {
    if (!localMap.has(cursorName)) {
      return;
    }
    const {type, ref} = localMap.get(cursorName);
    const decl = viewVariable(core, cursorName, type, ref.address);
    const cursorPos = decl.value.current.toInteger();
    if (cursorPos < 0 || cursorPos > elemCount) {
      return;
    }
    const cursor = {name: cursorName, color: {bg: "#eee"}};
    if ('store' in decl.value) {
      const cursorPrevPos = decl.value.previous.toInteger();
      if (cursorPrevPos >= 0 && cursorPrevPos <= elemCount) {
        cursor.prev = cursorPrevPos;
      }
    }
    if (!(cursorPos in infoMap)) {
      infoMap[cursorPos] = {};
    }
    const infos = infoMap[cursorPos];
    if (!('cursors' in infos)) {
      infos.cursors = [];
    }
    infos.cursors.push(cursor);
  };

  const computeArrowPoints = function (p) {
    const dx1 = arrowSize / 3;
    const dy1 = arrowSize / 3;
    const dx2 = arrowSize / 15;
    const dy2 = arrowSize;
    return [p(0,0), p(-dx1,dy1), p(-dx2,dy1), p(-dx2,dy2), p(dx2,dy2), p(dx2,dy1), p(dx1,dy1), p(0,0)].join(' ');
  };
  const arrowPoints = {
    up:    computeArrowPoints((dx,dy) => `${+dx},${+dy}`),
    down:  computeArrowPoints((dx,dy) => `${+dx},${-dy}`),
    left:  computeArrowPoints((dx,dy) => `${+dy},${+dx}`),
    right: computeArrowPoints((dx,dy) => `${-dy},${+dx}`)
  };
  const drawArrow = function (x, y, dir, style) {
    return <polygon points={arrowPoints[dir]} transform={`translate(${x},${y})`} {...style} />;
  };

  const drawCells = function (view) {
    const {rows, rowCount, colCount} = view;
    const elements = [];
    rows.forEach(function (row) {
      const rowIndex = row.index;
      const y1 = textLineHeight * 1 - textBaseline;
      const y1a = y1 - strikeThroughHeight;
      const y2 = textLineHeight * 2 - textBaseline;
      row.content.forEach(function (cell) {
        const colIndex = cell.index;
        const {content} = cell;
        const x = 0.5 * cellWidth;
        elements.push(
          <g transform={`translate(${colIndex * cellWidth},${rowIndex * cellHeight})`} clipPath="url(#cell)">
            {content && 'store' in content && <g>
              <text x={x} y={y1} textAnchor="middle" fill="#777">
                {renderValue(content.previous)}
              </text>
              <line x1={5} x2={cellWidth - 5} y1={y1a} y2={y1a} stroke="#777" strokeWidth="1"/>
            </g>}
            <text x={x} y={y2} textAnchor="middle" fill="#000">
              {renderValue(content.current)}
            </text>
          </g>
        );
      });
    });
    return <g transform={`translate(${gridLeft},${gridTop})`}>{elements}</g>;
  };

  const drawGrid = function (rowCount, colCount) {
    const elements = [];
    // Horizontal lines
    const x1 = gridLeft, x2 = x1 + colCount * cellWidth;
    for (let i = 0, y = gridTop; i <= rowCount; i += 1, y += cellHeight) {
      elements.push(<line x1={x1} x2={x2} y1={y} y2={y} stroke={gridStroke} strokeWidth={gridStrokeWidth} />);
    }
    // Vertical lines
    const y1 = gridTop, y2 = y1 + rowCount * cellHeight;
    for (let j = 0, x = gridLeft; j <= colCount; j += 1, x += cellWidth) {
      elements.push(<line x1={x} x2={x} y1={y1} y2={y2} stroke={gridStroke} strokeWidth={gridStrokeWidth} />);
    }
    // Row labels
    let y = gridTop + (cellHeight + textLineHeight) / 2 - textBaseline;
    let x = gridLeft - gridBorderLeft;
    for (let i = 0; i < rowCount; i += 1, y += cellHeight) {
      elements.push(
        <text x={x} y={y} textAnchor="end" fill="#777">{i}</text>
      );
    }
    // Column labels
    x = gridLeft + cellWidth / 2;
    y = gridTop - gridBorderTop - textBaseline;
    for (let i = 0; i < rowCount; i += 1, x += cellWidth) {
      elements.push(
        <text x={x} y={y} textAnchor="middle" fill="#777">{i}</text>
      );
    }
    return <g>{elements}</g>;
  };

  const drawRowCursors = function (rowCount, colCount, infoMap) {
    const elements = [];
    const x0 = gridLeft;
    const x1 = - gridBorderLeft - (textArrowSpacing + arrowSize);
    const x2 = x1 - colNumWidth;
    const y1 = (cellHeight + textLineHeight) / 2 - textBaseline;
    const y2 = y1 - textArrowHeight;
    let y0 = gridTop;
    for (let i = 0; i < rowCount; i += 1, y0 += cellHeight) {
      if (infoMap[i]) {
        const label = infoMap[i].cursors.map(cursor => cursor.name).join(',');
        const color = infoMap[i].cursors[0].color;
        elements.push(drawArrow(x0 + x1, y0 + y2, 'right'));
        elements.push(<text x={x0 + x2} y={y0 + y1} textAnchor="end" fill="#777">{label}</text>);
        elements.push(<rect x={x0} y={y0} width={cellWidth * colCount} height={cellHeight} fill={color.bg} fillOpacity={cursorBgOpacity}/>);
      }
    }
    return <g>{elements}</g>;
  };

  const drawColCursors = function (colCount, rowCount, infoMap) {
    const elements = [];
    let x0 = gridLeft;
    const y0 = gridTop;
    const x1 = cellWidth / 2;
    const y1 = - gridBorderTop - textLineHeight - textBaseline; // + arrow
    const y2 = y1 - (textBaseline + textArrowSpacing + arrowSize);
    for (let j = 0; j < colCount; j += 1, x0 += cellWidth) {
      if (infoMap[j]) {
        const label = infoMap[j].cursors.map(cursor => cursor.name).join(',');
        const color = infoMap[j].cursors[0].color;
        elements.push(drawArrow(x0 + x1, y0 + y1, 'down'));
        elements.push(<text x={x0 + x1} y={y0 + y2} textAnchor="middle" fill="#777">{label}</text>);
        elements.push(<rect x={x0} y={y0} width={cellWidth} height={cellHeight * rowCount} fill={color.bg} fillOpacity={cursorBgOpacity}/>);
      }
    }
    return <g>{elements}</g>;
  };

  const onViewChange = function (event) {
    const update = {viewState: event.value};
    self.props.onChange(self.props.directive, update);
  };

  const getViewState = function () {
    const {controls} = self.props;
    const viewState = controls && controls.get('viewState');
    return viewState || ViewerHelper.getDefaultValue();
  };

  self.render = function () {
    const {scale} = self.props;
    const view = extractView();
    if (view.error) {
      return <div className='clearfix'>{view.error}</div>;
    }
    const {rowCount, colCount, rowInfoMap, colInfoMap, height} = view;
    const svgHeight = gridLeft + colCount * cellWidth;
    const svgWidth = gridLeft + colCount * cellWidth;
    const divHeight = ((height === 'auto' ? svgHeight : height) * scale) + 'px';
    const viewState = getViewState();
    return (
      <div className='clearfix' style={{padding: '2px'}}>
        <div style={{width: '100%', height: divHeight}}>
          <ViewerResponsive tool='pan' value={viewState} onChange={onViewChange} background='transparent' specialKeys={[]}>
            <svg width={svgWidth} height={svgHeight} version="1.1" xmlns="http://www.w3.org/2000/svg">
              <g transform={`scale(${scale})`}>
                <clipPath id="cell">
                  <rect x="0" y="0" width={cellWidth} height={cellHeight}/>
                </clipPath>
                <g style={{fontFamily: 'Open Sans', fontSize: '13px'}}>
                  {drawRowCursors(rowCount, colCount, rowInfoMap)}
                  {drawColCursors(colCount, rowCount, colInfoMap)}
                  {drawGrid(rowCount, colCount)}
                  {drawCells(view)}
                </g>
              </g>
            </svg>
          </ViewerResponsive>
        </div>
      </div>
    );
  };

});
