const { gql } = require('apollo-server');

const typeDefs = gql`
	type Query {
		getClient: String
	}
`;

module.exports = typeDefs;
