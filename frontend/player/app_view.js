
import React from 'react';

/*
      screen      main-view-no-subtitles
  xs      …800    best effort
  sm   800…1024   794  (subtitles always hidden)
  md  1024…1200   940 if no subtitles, 794 if subtitles
  lg  1200…      1140 if no subtitles, 940 if no subtitles
*/

class PlayerApp extends React.PureComponent {
  render () {
    const {preventInput, containerWidth, PlayerControls, MainView, MainViewPanes, showSubtitlesBand, SubtitlesBand} = this.props;
    return (
      <div id='main'>
        <PlayerControls/>
        <div id='mainView-container' style={{width: `${containerWidth}px`}}>
          <MainView preventInput={preventInput}/>
          <MainViewPanes/>
        </div>
        {showSubtitlesBand && <SubtitlesBand/>}
      </div>
    );
  }
}

export default function (bundle, deps) {

  bundle.use('PlayerControls', 'MainView', 'MainViewPanes', 'getPlayerState', 'SubtitlesBand');
  bundle.defineView('PlayerApp', PlayerAppSelector, PlayerApp);

  function PlayerAppSelector (state, props) {
    const {PlayerControls, MainView, MainViewPanes, SubtitlesBand} = deps;
    const containerWidth = state.get('containerWidth');
    const showSubtitlesBand = state.get('showSubtitlesBand');
    const player = deps.getPlayerState(state);
    const status = player.get('status');
    const preventInput = !/ready|paused/.test(status);
    return {
      preventInput, containerWidth, PlayerControls, MainView, MainViewPanes,
      showSubtitlesBand, SubtitlesBand
    };
  }

};
