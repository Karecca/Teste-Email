import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'


export default class SessionsController {

  async store({ auth, request, response }: HttpContextContract) {
    const { email, password } = request.only(['username', 'email', 'password'])

    const token = await auth.use('api').attempt(email, password, { expiresIn: '2hours' })
    return response.created({ user: auth.user, token })

    /*
    try {
      const token = await auth.use('api').attempt(email, password)

      await Mail.sendLater((message) => {
        message
          .from('contato@quinzeautomacao.com.br')
          .to('cristiansantos.free@gmail.com')
          .subject('Vc se inscreveu na api da Quinze!!!')
          .htmlView('emails/welcome', { name: username, token: token.token })
      })
      return token
    } catch (error) {
      return response.unauthorized('Invalid Credentials')

    }
*/
  }

  async destroy({ auth, response }: HttpContextContract) {
    await auth.logout()
    return response.ok({})
  }
}
