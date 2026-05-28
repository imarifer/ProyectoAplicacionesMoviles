const {GoogleGenAI, Type} = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config();

//Configuramos el servicio de Gemini
const servicioIA = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

//Debemos pasarle el buffer de la imagen a la función que se encargara de extraer lo necesario del ticket
const procesarTicket = async (bufferTicket) => {
    try{
        //El buffer es una estructura de 0 y 1 así que lo pasamos a string  para que el sdk pueda recibirlo 
        const stringTicket = {
            inlineData: {
                data: bufferTicket.toString('base64'),
                mimeType: 'image/jpeg'
            }
        }

        //Configuramos las instrucciones del sistema
        const instrucciones = `
        Eres un asistente experto en gestión de inventario de cocina y despensa del hogar.
        Tu único objetivo es analizar la imagen de un ticket de compra de supermercado o almacén y extraer
        los productos que sean EXCLUSIVAMENTE  alimentos o ingredientes comestibles.

        Reglas estrictas de filtrado:
        1. Incluye: frutas, verduras, carnes, lácteos, panadería, abarrotes, condimentos, bebidas, snacks.
        2. Descarta por completo: productos de limpieza(detergentes, lavanderia), artículos de higiene personal(shampoo, desodorante, papel higiénico), 
        bolsas de plástico, vajilla, alimento para mascotas, ropa o cualquier objeto no comestible para humanos.

        Reglas de formato:
        1. Limpia los nombres de los productos: elimina códigos internos del supermercado, abreviaturas confusas o precios mezclados en el texto 
        para que el nombre del alimento o ingrediente sea claro y legible(ej. cambia "LECHE ENTERA SANTA CLARA 1L" a "Leche entera").Si no estás seguro
        de que alimento es, opta por regresar el alimento que más consideres parecido(ej. cambia "Pollo o pavo" a "Pollo"). Si hay productos repetidos solo agregalo una vez.
        2. Genera un tip de conservación para cada producto basado en su nivel de perecibilidad(ej. "Leche entera"->"Refrigerar después de abrir"). Los tips deben ser cortos
        menteniendolo en una línea para visualizar en una pantalla de un móvil.
        3. De no encontrar ningún alimento o ingrediente comestible, responde con un array vacío y sin errores. Nunca incluyas productos no comestibles.
        `;

        console.log("Enviando ticket para el análisis");

        const respuesta = await servicioIA.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                "Analiza detalladamente este ticket de compra y extrae los alimentos siguiendo las reglas del sistema",
                stringTicket
            ],
            config: {
                systemInstruction: instrucciones,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            nombre: {type: Type.STRING},
                            tipConservacion: {type: Type.STRING}
                        },
                        required: ['nombre', 'tipConservacion']
                    }
                }
            }
        });

        console.log("Se pudo llegar hasta aquí");
        const respuestaJSON = JSON.parse(respuesta.text);
        return {value: true, content: respuestaJSON};
    }
    catch(e){
        console.error("Se produjo un error al procesar el ticket");
        console.log(e);
    }
}

//Función para generar la receta en base a los ingredientes 
const generarReceta = async(tipo, alimentos) => {
    console.log("Estamos dentro del servicio para generar la receta en gemini");
    try{
        console.log("Empezamos mandando datos");
        const categoria = tipo;
        const ingredientes = alimentos;
        //Definimos las categorias validas
        const categoriasValidas = ['desayuno', 'comida', 'cena', 'postre'];
        //Nos aseguramos que se haya seleccionado una categoria valida, de no ser así entonces colocamos desayuno por defecto
        const categoriaFinal = categoriasValidas.includes(categoria.toLowerCase()) ? categoria.toLowerCase() : 'desayuno';

        //Configuramos las instrucciones del sistema
        const instrucciones = `
        Eres un chef profesional y nutricionista experto en cocina de aprovechamiento(para evitar el desperdicio de comida).
        To objetivo es crear una receta creativa, deliciosa y realista utilizando como base PRINCIPAL la lista de ingredientes que
        te proporciona el usuario.

        Reglas estrictas de cocina:
        1. Puedes asumir que el usuario tiene ingredientes básicos de despensa como: sal, pimienta, aceite, agua, ajo o cebolla.
        2. Intenta no añadir ingredientes extra complejos que no estén en la lista.Casi obligatorio.
        3. La receta debe adaptarse obligatoriamente a la categoría solicitada(desayuno, comida, cena, postre) ej. si es 'cena' debe ser algo
        más ligero que una 'comida'.
        4. Si faltan la mayoría de los ingredientes necesarios para una receta completa, genera la receta de forma normal pero indicando claramente dentro
        de la respuesta en el apartado de disponible para cada ingrediente si se encuentra disponible o no con un valor True/False.
        5. Devuelve el nombre del ingrediente que uses tal como se te paso, no agreges cantidades ni medidas.(ej. se te paso->Jamón regresas->Jamón).
        6. No repitas los ingredientes, pasa nombres unicos dentro de la lista de ingredientes y apegate a los que se tengan disponibles.
        7. No des dos tipos de alimentos en los ingredientes apegate al que se tenga disponible(ej. dar "Pan blanco" en lugar de "Pan de molde").
        `;

        console.log("Pidiendo receta");

        const respuesta = await servicioIA.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                `Genera una receta de la categoría ${categoriaFinal} utilizando los ingredientes disponibles en la despensa: ${ingredientes}`
            ],
            config: {
                systemInstruction: instrucciones, 
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        nombreReceta: {type: Type.STRING},
                        ingredientes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    ingrediente: {type: Type.STRING},
                                    disponible: {type: Type.BOOLEAN}
                                }
                            }
                        },
                        pasos: {
                            type: Type.ARRAY,
                            items: {type: Type.STRING}
                        },
                        tiempoPreparacion: {type: Type.NUMBER},
                        calorias: {type: Type.NUMBER},
                    },
                    required: ['nombreReceta', 'ingredientes', 'pasos', 'tiempoPreparacion', 'calorias']
                }
            }
        });
        console.log("Si pasamos del proceso de generación");
        const respuestaJSON = JSON.parse(respuesta.text);
        console.log(respuestaJSON);
        return {value: true, content: respuestaJSON};
    }
    catch(e){
        console.error("Se produjo un error al generar la receta");
        console.log(e);
    }
}

module.exports = {
    procesarTicket,
    generarReceta
}
