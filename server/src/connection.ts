import {
	createConnection,
	ProposedFeatures,
} from 'vscode-languageserver/node';


export const connection = createConnection(ProposedFeatures.all);