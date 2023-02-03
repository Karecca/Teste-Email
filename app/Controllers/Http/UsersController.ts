import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BadRequest from 'App/Exceptions/BadRequestException'

import User from 'App/Models/User'
import CreateUser from 'App/Validators/CreateUserValidator'

export default class UsersController {

  async store({ request, response }: HttpContextContract) {
    const data = await request.validate(CreateUser)
    const userByEmail = await User.findBy('email', data.email)
    const userByUsername = await User.findBy('username', data.username)

    if (userByEmail)
      throw new BadRequest('email already in use', 409)

    if (userByUsername)
      throw new BadRequest('username already in use', 409)

    const user = await User.create(data)

    return response.created({ user })
  }
}
