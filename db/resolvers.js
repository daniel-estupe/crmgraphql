const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: 'variables.env' });

const crearToken = (usuario, secret, expiresIn) => {
	const { id, email, nombre, apellido } = usuario;

	return jwt.sign({ id, email }, secret, { expiresIn });
};

const resolvers = {
	Query: {
		obtenerUsuario: async (_, { token }) => {
			const usuarioid = await jwt.verify(token, process.env.SECRET);

			return usuarioid;
		},
		obtenerProductos: async () => {
			try {
				const productos = await Producto.find({});
				return productos;
			} catch (error) {
				console.log(error);
			}
		},
		obtenerProducto: async (_, { id }) => {
			const producto = await Producto.findById(id);

			if (!producto) {
				throw new Error('Producto no encontrado');
			}

			return producto;
		}
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
		},
		autenticarUsuario: async (_, { input }) => {
			const { email, password } = input;

			// si el usuario existe
			const existeUsuario = await Usuario.findOne({ email });
			if (!existeUsuario) {
				throw new Error('El usuario no existe.');
			}

			// revisar si el password es correcto
			const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);
			if (!passwordCorrecto) {
				throw new Error('La contraseña es incorrecta.');
			}

			// crear el token
			return {
				token: crearToken(existeUsuario, process.env.SECRET, '24h')
			};
		},
		nuevoProducto: async (_, { input }) => {
			try {
				const producto = new Producto(input);

				// almacenar en la base de datos
				const resultado = await producto.save();

				return resultado;
			} catch (error) {
				console.log(error);
			}
		},
		actualizarProducto: async (_, { id, input }) => {
			let producto = await Producto.findById(id);

			if (!producto) {
				throw new Error('Producto no encontrado');
			}

			producto = await Producto.findOneAndUpdate({ _id: id }, input, { new: true });

			return producto;
		},
		eliminarProducto: async (_, { id }) => {
			let producto = await Producto.findById(id);

			if (!producto) {
				throw new Error('Producto no encontrado');
			}

			await Producto.findOneAndDelete({ _id: id });

			return 'Producto eliminado.';
		}
	}
};

module.exports = resolvers;
