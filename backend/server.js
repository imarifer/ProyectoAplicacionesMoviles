const express = require('express');
const multer = require('multer');
const {procesarTicket, generarReceta} = require('./servicioGemini');

//Evitamos que se guarde en disco, así que solo se retiene en memoria RAM con solo almacenamiento volatil 
const storage = multer.memoryStorage();
const upload = multer( {storage: storage} );

//Inicializamos la aplicación de Express para levantar el servidor
const app = express();

app.use(express.json());

//Puerto en donde se ejecuta el servidor 
const PORT = 3000;

//Definimos el endpoint que nos indicará que el servidor está funcionando 
app.get('/', (req, res)=>{
    res.send("Backend funcionando");
});

//Petición para generar la receta desde el servicio de Gemini
app.post('/generar-Receta', async(req, res) => {
    console.log("Dentro del servicio de generar receta");
    try{
        const categoria = req.body.tipo;
        const ingredientes = req.body.ingredientes;
        console.log(categoria);
        console.log(ingredientes);
        const response = await generarReceta(categoria, ingredientes);
        if(response.value){
            console.log("Se genero la receta de forma correcta");
            return res.send({value: true, content: response.content});
        }else{
            console.log("Hubo un error con la conexión con el servicio de gemini");
            return res.send({value: false, content: "No se obtuvo ninguna receta"});
            console.log(response);
        }
    }
    catch(e){
        console.error("Error al generar la receta desde el servidor");
        console.log(e);
    }
})
//Petición para el análisis de tickets de compra
app.post('/analizar-Ticket', upload.single('ticket'), async(req, res) => {
    console.log("Dentro del servicio de análisis de ticket");
    try{
        //Recuperamos el buffer que viene desde el fetch en el frontend 
        const ticketData = req.file.buffer;
        //Mandamos a llamar a la función correspondiente para el análisis
        console.log(ticketData);
        const response = await procesarTicket(ticketData);
        if(response.value){
            console.log("Analisis realizado desde el servidor exitosamente");
            return res.send({value: true, content: response.content});
        }else{
            return res.send({value: false, content: "Error en el análisis con Gemini"});
        }
    }
    catch(e){
        console.log("Error al lanzar el ticket dentro del servidor")
        throw e;
    }
});

//Ponemos a escuchar el servidor en el puerto definido
app.listen(PORT, () => {
    console.log("Servidor funcionando correctamente");
    console.log(`http://localhost:${PORT}`);
})


