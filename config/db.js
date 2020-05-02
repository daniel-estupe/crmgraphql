const mongoose = require('mongoose');
require('dotenv').config({ path: 'variables.env' });

const conectarDB = async () => {
	try {
		await mongoose.connect(process.env.DB_MONGO, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useFindAndModify: false,
			useCreateIndex: true
		});

		console.log('Se ha establecido conexión a la base de datos.');
	} catch (error) {
		console.log('Hubo un error al conectarse a la base de datos.', error);
		process.exit(1);
	}
};

module.exports = conectarDB;
