const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
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
		},
		obtenerClientes: async () => {
			try {
				const clientes = await Cliente.find({});
				return clientes;
			} catch (error) {
				console.log(error);
			}
		},
		obtenerClientesVendedor: async (_, {}, ctx) => {
			try {
				const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString() });
				return clientes;
			} catch (error) {
				console.log(error);
			}
		},
		obtenerCliente: async (_, { id }, ctx) => {
			// revisar si el cliente existe o no
			const cliente = await Cliente.findById(id);
			if (!cliente) {
				throw new Error('Cliente no encontrado.');
			}

			// quien lo creó puede verlo
			if (cliente.vendedor.toString() !== ctx.usuario.id) {
				throw new Error('No tienes las credenciales.');
			}

			return cliente;
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
				await usuario.save();
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
		},
		nuevoCliente: async (_, { input }, ctx) => {
			const { email } = input;

			// verificar si el cliente ya está registrado
			const cliente = await Cliente.findOne({ email });
			if (cliente) {
				throw new Error('Ese cliente ya está registrado.');
			}

			const clienteNuevo = new Cliente(input);

			// asignar el vendedor
			clienteNuevo.vendedor = ctx.usuario.id;

			// guardarlo en la base de datos
			try {
				return await clienteNuevo.save();
			} catch (error) {
				console.log(error);
			}
		},
		actualizarCliente: async (_, { id, input }, ctx) => {
			// verificar si existe o no
			let cliente = await Cliente.findById(id);

			if (!cliente) {
				throw new Error('Ese cliente no existe');
			}

			// verificar si el vendedor es quien edita
			if (cliente.vendedor.toString() !== ctx.usuario.id) {
				throw new Error('No tienes las credenciales.');
			}

			// guardar el cliente
			cliente = await Cliente.findOneAndUpdate({ _id: id }, input, { new: true });
			return cliente;
		},
		eliminarCliente: async (_, { id }, ctx) => {
			// verificar si existe o no
			let cliente = await Cliente.findById(id);

			if (!cliente) {
				throw new Error('Ese cliente no existe');
			}

			// verificar si el vendedor es quien edita
			if (cliente.vendedor.toString() !== ctx.usuario.id) {
				throw new Error('No tienes las credenciales.');
			}

			await Cliente.findOneAndDelete({ _id: id });

			return 'Cliente eliminado.';
		}
	}
};

module.exports = resolvers;
