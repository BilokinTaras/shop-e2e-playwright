import { TokenSchema } from '../schemas/store';
import { BaseClient } from './base-client';

/** Medusa auth routes: `/auth/{actor}/emailpass` for login and `/register` for new identities. */
export class AuthClient extends BaseClient {
  async login(actor: 'customer' | 'user', email: string, password: string): Promise<string> {
    return (await this.call(TokenSchema, 'POST', `/auth/${actor}/emailpass`, { data: { email, password } }))
      .token;
  }

  /** Registers an auth identity; the returned token is only good for creating the customer profile. */
  async registerCustomer(email: string, password: string): Promise<string> {
    return (
      await this.call(TokenSchema, 'POST', '/auth/customer/emailpass/register', { data: { email, password } })
    ).token;
  }
}
