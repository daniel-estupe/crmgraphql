const { ApolloServer } = require('apollo-server');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: 'variables.env' });

const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');

const conectarDB = require('./config/db');

conectarDB();

// server
const server = new ApolloServer({
	typeDefs,
	resolvers,
	context: async ({ req }) => {
		const token = req.headers['authorization'] || '';
		if (token) {
			try {
				const usuario = await jwt.verify(token, process.env.SECRET);

				return {
					usuario
				};
			} catch (error) {
				console.log('Hubo un error');
				console.log(error);
			}
		}
	}
});

// run server
server.listen().then(({ url }) => {
	console.log(`Server running on ${url}`);
});
