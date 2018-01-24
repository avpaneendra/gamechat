import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter, Route, Switch} from 'react-router-dom'
import registerServiceWorker from './registerServiceWorker';

import Boring from './boring';
import Fun from './fun'
import VWave from './voicewave';

import './index.css';

const Routes = (props) => (
	<BrowserRouter>
		<Switch>
			<Route exact path="/" component={Boring} />
			<Route exact path="/fun" component={Fun} />
			<Route exact path="/vwave" component={VWave} />
		</Switch>
	</BrowserRouter>
)

ReactDOM.render(<Routes />, document.getElementById('root'));
registerServiceWorker();
