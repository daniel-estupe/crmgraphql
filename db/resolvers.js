const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');

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
		},
		obtenerPedidos: async () => {
			try {
				const pedidos = await Pedido.find({});
				return pedidos;
			} catch (error) {
				console.log(pedidos);
			}
		},
		obtenerPedidosVendedor: async (_, {}, ctx) => {
			try {
				const pedidos = await Pedido.find({ vendedor: ctx.usuario.id });
				return pedidos;
			} catch (error) {
				console.log(pedidos);
			}
		},
		obtenerPedido: async (_, { id }, ctx) => {
			// verificar si el pedido existe
			const pedido = await Pedido.findById(id);
			if (!pedido) {
				throw new Error('Pedido no encontrado.');
			}

			// solo quien crea el pedido puede verlo
			if (pedido.vendedor.toString() !== ctx.usuario.id) {
				throw new Error('No tiene las credenciales.');
			}

			// enviar el resultado de búsqueda
			return pedido;
		},
		obtenerPedidosEstado: async (_, { estado }, ctx) => {
			const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });
			return pedidos;
		},
		mejoresClientes: async () => {
			const clientes = await Pedido.aggregate([
				{ $match: { estado: 'COMPLETADO' } },
				{
					$group: {
						_id: '$cliente',
						total: { $sum: '$total' }
					}
				},
				{
					$lookup: {
						from: 'clientes',
						localField: '_id',
						foreignField: '_id',
						as: 'cliente'
					}
				},
				{
					$sort: { total: -1 }
				}
			]);

			return clientes;
		},
		mejoresVendedores: async () => {
			const vendedores = await Pedido.aggregate([
				{ $match: { estado: 'COMPLETADO' } },
				{
					$group: {
						_id: '$vendedor',
						total: { $sum: '$total' }
					}
				},
				{
					$lookup: {
						from: 'usuarios',
						localField: '_id',
						foreignField: '_id',
						as: 'vendedor'
					}
				},
				{
					$limit: 3
				},
				{
					$sort: { total: -1 }
				}
			]);

			return vendedores;
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
		},
		nuevoPedido: async (_, { input }, ctx) => {
			const { cliente: id, pedido } = input;

			// verificar si el cliente existe o no
			let cliente = await Cliente.findById(id);

			if (!cliente) {
				throw new Error('Ese cliente no existe');
			}

			// verificar si el cliente es del vendedor
			if (cliente.vendedor.toString() !== ctx.usuario.id) {
				throw new Error('No tienes las credenciales.');
			}

			// revisar que el stock esté disponible
			for await (const articulo of pedido) {
				const { id, cantidad } = articulo;

				const producto = await Producto.findById(id);

				if (cantidad > producto.existencia) {
					throw new Error(`El artículo ${producto.nombre} excede la cantidad disponible`);
				} else {
					producto.existencia -= cantidad;
					await producto.save();
				}
			}

			// crear un nuevo pedido
			const nuevoPedido = new Pedido(input);

			// asignarle un vendedor
			nuevoPedido.vendedor = ctx.usuario.id;

			// guardarlo en la base de datos
			return await nuevoPedido.save();
		},
		actualizarPedido: async (_, { id, input }, ctx) => {
			const { cliente } = input;

			// verificar si el pedido existe
			const existePedido = await Pedido.findById(id);
			if (!existePedido) {
				throw new Error('El pedido no existe.');
			}

			// verificar si el cliente existe
			const existeCliente = await Cliente.findById(cliente);
			if (!existeCliente) {
				throw new Error('El cliente no existe.');
			}

			// si el cliente y pedido pertenece al vendedor
			if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
				throw new Error('No tienes las credenciales.');
			}

			// revisar el stock
			if (input.pedido) {
				for await (const articulo of input.pedido) {
					const { id, cantidad } = articulo;

					const producto = await Producto.findById(id);

					if (cantidad > producto.existencia) {
						throw new Error(`El artículo ${producto.nombre} excede la cantidad disponible`);
					} else {
						producto.existencia -= cantidad;
						await producto.save();
					}
				}
			}

			// guardar el pedido
			const resultado = await Pedido.findOneAndUpdate({ _id: id }, input, { new: true });
			return resultado;
		},
		eliminarPedido: async (_, { id }, ctx) => {
			// verificar si el pedido existe
			const pedido = await Pedido.findById(id);
			if (!pedido) {
				throw new Error('El pedido no existe.');
			}

			// verificar si el vendedor es quien lo intenta borrar
			if (pedido.vendedor.toString() !== ctx.usuario.id) {
				throw new Error('No tienes las credenciales.');
			}

			await Pedido.findOneAndDelete({ _id: id });
			return 'Pedido eliminado.';
		}
	}
};

module.exports = resolvers;
