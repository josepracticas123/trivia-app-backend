/* Esquemas OpenAPI del catálogo de preguntas y categorías.
   Los nombres NO se cambian: los @openapi hacen $ref a ellos. */
export const questionSchemas = {
  // Representa una categoría disponible para asignar a la pregunta.
  Categoria: {
    type: "object",
    properties: {
      id: {
        type: "integer",
        example: 1,
      },
      name: {
        type: "string",
        example: "Geografía",
      },
    },
    required: ["id", "name"],
  },
  // Representa una pregunta que podemos devolver al cliente.
  // Importante: NO contiene respuestaCorrecta.
  PreguntaPublica: {
    type: "object",
    properties: {
      id: {
        type: "integer",
        example: 1,
      },
      categoryId: {
        type: "integer",
        example: 1,
      },
      enunciado: {
        type: "string",
        example: "¿Cuál es la capital de España?",
      },
      opciones: {
        type: "array",
        minItems: 4,
        maxItems: 4,
        items: {
          type: "string",
        },
        example: ["Madrid", "Barcelona", "Valencia", "Sevilla"],
      },
    },
    required: ["id", "enunciado", "categoryId", "opciones"],
  },
  // Representa los datos necesarios para crear o actualizar una pregunta.
  // Aquí SÍ incluimos respuestaCorrecta porque forma parte de la entrada.
  PreguntaInput: {
    description:
      "El servidor elimina los espacios al principio y al final de enunciado y opciones. Los textos no pueden quedar vacíos después de esa limpieza y las opciones deben ser distintas después de limpiarlas.",
    type: "object",
    additionalProperties: false,
    properties: {
      categoryId: {
        type: "integer",
        minimum: 1,
        maximum: 2147483647,
      },
      enunciado: {
        type: "string",
        minLength: 1,
        example: "¿Cuál es la capital de España?",
      },
      opciones: {
        type: "array",
        minItems: 4,
        maxItems: 4,
        uniqueItems: true,
        items: {
          type: "string",
          minLength: 1,
        },
        example: ["Madrid", "Barcelona", "Valencia", "Sevilla"],
      },
      respuestaCorrecta: {
        type: "integer",
        minimum: 0,
        maximum: 3,
        example: 0,
      },
    },
    required: ["categoryId", "enunciado", "opciones", "respuestaCorrecta"],
  },
};
