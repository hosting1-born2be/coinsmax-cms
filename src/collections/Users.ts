import type { CollectionConfig, PayloadRequest } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    forgotPassword: {
      generateEmailHTML: (args?: { token?: string }) => {
        const token = args?.token
        if (!token) {
          return `<p>Error: No reset token provided.</p>`
        }
        return `<a href="${process.env.WEB_FRONT_URL}/set-password?token=${token}">Reset</a>`
      },
    },
  },
  access: {
    /*read: function (args: { req: PayloadRequest }) {
      return args.req.user?.role === 'admin'
    },*/
    read: () => true,
    create: () => true,
    update: () => true,
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      label: 'First Name',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'Last Name',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Phone',
      required: false,
    },
    {
      name: 'address1',
      type: 'text',
      label: 'Address line 1',
      required: false,
    },
    {
      name: 'address2',
      type: 'textarea',
      label: 'Address line 2',
      required: false,
    },
    {
      name: 'city',
      type: 'text',
      label: 'City',
      required: false,
    },
    {
      name: 'state',
      type: 'text',
      label: 'State',
      required: false,
    },
    {
      name: 'zip',
      type: 'text',
      label: 'Zip Code',
      required: false,
    },
    {
      name: 'country',
      type: 'text',
      label: 'Country',
      required: false,
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Customer', value: 'customer' },
      ],
      defaultValue: 'customer',
      required: true,
    },
  ],
}
