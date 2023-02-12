import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BadRequest from 'App/Exceptions/BadRequestException'

import User from 'App/Models/User'
import CreateUser from 'App/Validators/CreateUserValidator'
import UpdateUser from 'App/Validators/UpdateUserValidator'

export default class UsersController {

  public async store({ request, response }: HttpContextContract) {
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

  public async update({ request, response, bouncer }: HttpContextContract) {
    const { email, password } = await request.validate(UpdateUser)
    const id = request.param('id')
    const user = await User.findOrFail(id)

    await bouncer.authorize('updateUser', user)

    if (email != user.email) {
      const userByEmail = await User.findBy('email', email)
      if (userByEmail)
        throw new BadRequest('email already in use', 409)
    }

    user.email = email
    user.password = password

    await user.save()

    return response.ok({ user })
  }
}
