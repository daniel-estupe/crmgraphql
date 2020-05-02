const Usuario = require('../models/Usuario');
const bcryptjs = require('bcryptjs');

const resolvers = {
	Query: {
		getClient: () => 'My first client.'
	},
	Mutation: {
		nuevoUsuario: async (_, { input }) => {
			const { email, password } = input;

			// revisar si el usuario ya está registrado
			const existeUsuario = await Usuario.findOne({ email });
			if (existeUsuario) {
				throw new Error('El usuario ya está registrado.');
			}

			// hashear su password
			const salt = await bcryptjs.genSalt(10);
			input.password = await bcryptjs.hash(password, salt);

			// guardarlo en la base de datos
			try {
				const usuario = new Usuario(input);
				usuario.save();
				return usuario;
			} catch (error) {
				console.log(error);
			}
		}
	}
};

module.exports = resolvers;
