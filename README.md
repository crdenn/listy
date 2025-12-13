# Listy

A real-time collaborative list management app for gift registries, potlucks, and event planning. Built with Next.js, Firebase, and shadcn/ui.

## Features

- **Two List Types:**
  - **Gift Lists:** Claims are hidden from other viewers (perfect for surprise gifts)
  - **Potluck/Event Lists:** Claims are visible to everyone (great for coordinating who's bringing what)

- **Easy Sharing:** Generate shareable links - no account required for participants

- **Real-time Updates:** See changes instantly when others add or claim items

- **Flexible Permissions:**
  - List creators can manage everything
  - All participants can add their own items
  - Claim and unclaim items at any time
  - Edit or delete items you added (if unclaimed)

- **Optional Sign-in:** Anonymous users can participate, or sign in with Google to save lists across devices

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Backend:** Firebase (Firestore, Authentication)
- **UI:** shadcn/ui, Tailwind CSS
- **Icons:** Lucide React

## Quick Start

### Prerequisites

- Node.js 18+
- Firebase project (see [SETUP.md](./SETUP.md))

### Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Add your Firebase config to .env.local

# Start development server
npm run dev
```

Visit `http://localhost:3000`

### Production

See [SETUP.md](./SETUP.md) for complete deployment instructions including:

- Firebase project setup
- Docker deployment on unRAID
- Cloudflare Tunnel configuration

## Usage

### Creating a List

1. Sign in with Google (or stay anonymous)
2. Click "New List" on the home page or "My Lists"
3. Choose a list type:
   - **Gift List** - For birthdays, holidays, wishlists (claims hidden)
   - **Potluck/Event** - For parties, gatherings (claims visible)
4. Add a title and optional description
5. Share the link with participants

### Adding Items

Anyone with the link can add items:

1. Open the list via the shared link
2. Fill in the item name and optional details
3. Click "Add Item"

### Claiming Items

- Click "Claim" on any unclaimed item
- Your name appears (visible only to you on gift lists, visible to all on potluck lists)
- Click "Unclaim" to release an item

### Managing Items

- **Your items:** Edit or delete anytime (if unclaimed)
- **Claimed items:** Cannot be deleted by the creator
- **List owners:** Can edit or delete any item

## Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── page.tsx           # Home page
│   ├── my-lists/          # User's lists page
│   └── list/[shareCode]/  # Individual list view
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Header, UserMenu
│   ├── list/              # List-related components
│   └── item/              # Item-related components
├── contexts/
│   └── AuthContext.tsx    # Authentication state
├── lib/
│   ├── firebase/          # Firebase config and operations
│   ├── hooks/             # Custom React hooks
│   └── utils.ts           # Helper functions
└── types/
    └── index.ts           # TypeScript types
```

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_APP_URL=
```

See [.env.local.example](./.env.local.example) for details.

## Security

- Firebase Security Rules enforce permissions server-side
- Anonymous sessions use locally-stored IDs
- Share codes are randomly generated (nanoid)
- No sensitive data in client-side storage

## License

MIT
