import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'


export default class SessionsController {

  async store({ auth, request, response }: HttpContextContract) {
    const { email, password } = request.all()

    try {
      const token = await auth.use('api').attempt(email, password)
      return token
    } catch (error) {
      return response.unauthorized('Invalid Credentials')

    }

  }
}
