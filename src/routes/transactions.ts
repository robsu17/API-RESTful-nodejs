import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { checkSessionIdExist } from '../middlewares/check-session-id-exist'

// Cookies -> Fromas do navegador manter contexto entre as requisições

/**
 * Testes Automatizados:
 * 
 * Unitários: unidade da sua aplicação
 * 
 * Integração: comunicação entre duas ou mais unidades
 * 
 * e2e - ponta a ponta: simulam um usuário operando na nossa aplicação
 * 
 * front-end: abre a págiona de login, digite o texto diego@rocketseat.com.br no campo
 * com ID email, clique no botão...
 * 
 * back-end: chamadas HTTP, websockets
 * 
 * Pirâmide de testes: E2E (não dependem de nenhuma tecnologia, não dependem de arquitetura)
 */

export async function transactionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    console.log(`[${request.method}] ${request.url}`)
  })
  
  app.get('/', {
    preHandler: [checkSessionIdExist]  // Antes de todo o código a função dentro dos colchete será executada
  }, async (request, reply) => {

    const { sessionId } = request.cookies 
    
    const transactions = await knex('transactions_1')
      .where('session_id', sessionId)
      .select('')
    return { transactions }
  })

  app.get('/:id', {
      preHandler: [checkSessionIdExist]  // Antes de todo o código a função dentro dos colchete será executada
    }, 
    async (request, reply) => {
      const getTransactionParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const { sessionId } = request.cookies 

    const { id } = getTransactionParamsSchema.parse(request.params)

    const transaction = await knex('transactions_1')
    .where({
      id,
      session_id: sessionId
    })
    .first()
  
    return { transaction }
  })

  app.get('/sumary', {
      preHandler: [checkSessionIdExist]  // Antes de todo o código a função dentro dos colchete será executada
    }, 
    async (request, reply) => {
      const { sessionId } = request.cookies 
      const sumary = await knex('transactions_1')
      .where('session_id', sessionId)
      .sum('amount', { as: 'amount'})
      .first()
      return { sumary }
  })
  
  app.post('/', async (request, reply) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    })

    const { title, amount, type } = createTransactionBodySchema.parse(request.body)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()
      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7days
      })
    }

    await knex('transactions_1').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId
    })

    return reply.status(201).send()
  })
}
