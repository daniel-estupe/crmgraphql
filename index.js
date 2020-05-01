const { ApolloServer } = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');

// server
const server = new ApolloServer({
	typeDefs,
	resolvers
});

// run server
server.listen().then(({ url }) => {
	console.log(`Server running on ${url}`);
});
