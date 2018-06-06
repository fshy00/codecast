
import React from 'react';
import ReactDOM from 'react-dom';
import classnames from 'classnames';
import scrollIntoViewIfNeeded from 'scroll-into-view-if-needed';
import Highlight from 'react-highlighter';

import {formatTime} from '../common/utils';
import {filterItems} from './utils';

export default function (bundle) {
  bundle.defineView('SubtitlesPane', SubtitlesPaneSelector, SubtitlesPane);
  bundle.defineAction('subtitlesFilterTextChanged', 'Subtitles.Pane.FilterText.Changed');
  bundle.addReducer('subtitlesFilterTextChanged', subtitlesFilterTextChangedReducer);
}

function SubtitlesPaneSelector (state, props) {
  const getMessage = state.get('getMessage');
  const {subtitlesFilterTextChanged, playerSeek} = state.get('scope');
  const {items, filteredItems, currentIndex, audioTime, filterText, filterRegexp} = state.get('subtitles');
  return {
    subtitlesFilterTextChanged, playerSeek, getMessage,
    subtitles: filteredItems,
    currentIndex, audioTime, filterText, filterRegexp};
}

/* SubtitlesPane is used in both *player* and *editor* mode. */
class SubtitlesPane extends React.PureComponent {
  render () {
    const {subtitles, currentIndex, editing, audioTime, filterText, filterRegexp, getMessage} = this.props;
    return (
      <div className='subtitles-pane'>
        {!editing &&
          <input type='text' onChange={this._filterTextChanged} value={filterText} />}
        {subtitles && subtitles.length > 0
          ? subtitles.map((st, index) => {
              const selected = currentIndex === index;
              if (!editing) {
                const ref = selected && this._refSelected;
                return <SubtitlePaneItem key={index} item={st} ref={ref} selected={selected} onJump={this._jump} highlight={filterRegexp} />;
              }
              if (selected) {
                return <SubtitlePaneItemEditor key={index} item={st} ref={this._refSelected} offset={audioTime - st.start} audioTime={audioTime}
                  onChange={this._changeItem} onInsert={this._insertItem} onRemove={this._removeItem} onShift={this._shiftItem} />;
              }
              return <SubtitlePaneItemViewer key={index} item={st} onJump={this._jump} />;
            })
          : <p>{getMessage('CLOSED_CAPTIONS_NOT_LOADED')}</p>}
      </div>
    );
  }
  componentDidUpdate (prevProps) {
    if (this.props.currentIndex !== prevProps.currentIndex) {
      if (this._selectedComponent) {
        const domNode = ReactDOM.findDOMNode(this._selectedComponent);
        // scrollIntoViewIfNeeded(domNode, {centerIfNeeded: true, easing: 'ease', duration: 300});
        // scroll domNode to center _selectedComponent vertically
      }
    }
  }
  _refSelected = (component) => {
    this._selectedComponent = component;
  };
  _jump = (subtitle) => {
    this.props.dispatch({type: this.props.playerSeek, audioTime: subtitle.start});
  };
  _changeItem = (item, text) => {
    const index = this.props.subtitles.indexOf(item);
    this.props.dispatch({type: this.props.subtitlesItemChanged, payload: {index, text}});
  };
  _insertItem = (item, offset, where) => {
    const index = this.props.subtitles.indexOf(item);
    this.props.dispatch({type: this.props.subtitlesItemInserted, payload: {index, offset, where}});
  };
  _removeItem = (item, merge) => {
    const index = this.props.subtitles.indexOf(item);
    this.props.dispatch({type: this.props.subtitlesItemRemoved, payload: {index, merge}});
  };
  _shiftItem = (item, amount) => {
    const index = this.props.subtitles.indexOf(item);
    this.props.dispatch({type: this.props.subtitlesItemShifted, payload: {index, amount}});
  };
  _filterTextChanged = (event) => {
    const text = event.target.value;
    this.props.dispatch({type: this.props.subtitlesFilterTextChanged, payload: {text}});
  };
}

/* SubtitlePaneItem is used in the *player* to show an item in the subtitles pane. */
class SubtitlePaneItem extends React.PureComponent {
  render() {
    const {item: {text, start, end}, selected, highlight} = this.props;
    const showTimestamps = false;
    return (
      <p className={classnames(['subtitles-item', selected && 'subtitles-item-selected'])} onClick={this._onClick}>
        {showTimestamps && <span className='subtitles-timestamp'>{formatTime(start)}</span>}
        <span className='subtitles-text'>
          <Highlight search={highlight||''}>{text}</Highlight>
        </span>
      </p>
    );
  }
  _onClick = () => {
    this.props.onJump(this.props.item);
  };
}

function subtitlesFilterTextChangedReducer (state, {payload: {text}}) {
  return state.update('subtitles', function (subtitles) {
    let re = null;
    if (text) {
      try {
        re = new RegExp(text, 'i');
      } catch (ex) {
        /* silently ignore error, keep last regexp */
        re = subtitles.filterRegexp;
      }
    }
    return {
      ...subtitles,
      filterText: text,
      filterRegexp: re,
      filteredItems: filterItems(subtitles.items, re)
    };
  });
}
