import { Llave } from '@models/llaves.schemas';

export const obtenerClave = async (tipo) => {
    let envio = 0;
    let resultado;
    try {
        resultado = await Llave.findOneAndUpdate(
            {
                tipo: tipo
            },
            {
                $inc: {
                    secuencia: 1
                }
            },
            {
                _id: 0,
                secuencia: 1,
                tipo: 0
            }
        )
        envio = (resultado === undefined ? 0 : resultado.secuencia)
    } catch (error) {
        await registrador("", "Ecommerce API", "Backend", "llave.js", "obtenerLlave", error.toString(), error, 1);
    }
    return envio;
};