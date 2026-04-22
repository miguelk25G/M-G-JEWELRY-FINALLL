import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.collectionProduct.deleteMany()
  await prisma.collection.deleteMany()
  await prisma.product.deleteMany()
  await prisma.siteSettings.deleteMany()

  // Create site settings
  await prisma.siteSettings.create({
    data: {
      id: 'main',
      siteName: 'M&G Jewelry',
      siteNameEs: 'M&G Jewelry',
      tagline: 'Luxury Diamond Jewelry',
      taglineEs: 'Joyería de Diamantes de Lujo',
      contactEmail: 'info@mgjewelry.com',
      contactPhone: '+1 (555) 123-4567',
      whatsappNumber: '+15125760229',
      instagramUrl: 'https://instagram.com/mgjewelry',
      defaultCurrency: 'USD',
      defaultLocale: 'en',
    },
  })

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: '2.99 Carat Diamond Ring',
        nameEs: 'Anillo de Diamante 2.99 Quilates',
        slug: '2-99-carat-diamond-ring',
        description: 'Natural diamond with exceptional cut, clarity, and brilliance. Set in 14K white gold with a classic solitaire setting. Perfect for engagements or special occasions.',
        descriptionEs: 'Diamante natural con corte, claridad y brillo excepcionales. Engastado en oro blanco de 14K con un clásico engaste solitario. Perfecto para compromisos u ocasiones especiales.',
        price: 10750,
        comparePrice: 12500,
        currency: 'USD',
        metalType: 'gold',
        karat: '14k',
        stoneType: 'natural',
        category: 'rings',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
          'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800',
        ]),
        isFeatured: true,
        isBestSeller: true,
        inventoryQty: 3,
        weight: 4.5,
        sizes: JSON.stringify(['5', '6', '7', '8', '9']),
      },
    }),
    prisma.product.create({
      data: {
        name: '1.75 Carat Diamond Ring',
        nameEs: 'Anillo de Diamante 1.75 Quilates',
        slug: '1-75-carat-diamond-ring',
        description: 'Beautiful pear-shaped diamond ring with exceptional clarity. Set in 18K white gold with a halo setting.',
        descriptionEs: 'Hermoso anillo de diamante en forma de pera con claridad excepcional. Engastado en oro blanco de 18K con engaste halo.',
        price: 9875,
        currency: 'USD',
        metalType: 'gold',
        karat: '18k',
        stoneType: 'natural',
        category: 'rings',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800',
        ]),
        isFeatured: true,
        isBestSeller: true,
        inventoryQty: 5,
        weight: 3.8,
        sizes: JSON.stringify(['5', '6', '7', '8']),
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cuban Link Chain 14K',
        nameEs: 'Cadena Eslabón Cubano 14K',
        slug: 'cuban-link-chain-14k',
        description: 'Classic Cuban link chain crafted in solid 14K yellow gold. 22 inches long, perfect for layering or wearing alone.',
        descriptionEs: 'Cadena clásica de eslabón cubano en oro amarillo sólido de 14K. 22 pulgadas de largo, perfecta para capas o usar sola.',
        price: 4250,
        comparePrice: 4800,
        currency: 'USD',
        metalType: 'gold',
        karat: '14k',
        stoneType: 'none',
        category: 'chains',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
        ]),
        isFeatured: true,
        isBestSeller: true,
        inventoryQty: 10,
        weight: 45.5,
        length: 22,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Diamond Tennis Bracelet',
        nameEs: 'Pulsera Tenis de Diamantes',
        slug: 'diamond-tennis-bracelet',
        description: 'Stunning tennis bracelet featuring 5 carats of round brilliant diamonds set in 18K white gold.',
        descriptionEs: 'Impresionante pulsera tenis con 5 quilates de diamantes redondos brillantes engastados en oro blanco de 18K.',
        price: 8500,
        currency: 'USD',
        metalType: 'gold',
        karat: '18k',
        stoneType: 'natural',
        category: 'bracelets',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
        ]),
        isFeatured: true,
        isBestSeller: false,
        inventoryQty: 4,
        weight: 12.3,
        length: 7,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Diamond Stud Earrings',
        nameEs: 'Aretes de Diamante',
        slug: 'diamond-stud-earrings',
        description: 'Classic diamond stud earrings featuring 1 carat total weight of round brilliant diamonds in 14K white gold.',
        descriptionEs: 'Aretes clásicos de diamante con 1 quilate de peso total de diamantes redondos brillantes en oro blanco de 14K.',
        price: 2450,
        currency: 'USD',
        metalType: 'gold',
        karat: '14k',
        stoneType: 'natural',
        category: 'earrings',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
        ]),
        isFeatured: true,
        isBestSeller: true,
        inventoryQty: 15,
        weight: 2.1,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Rope Chain 18K',
        nameEs: 'Cadena Rope 18K',
        slug: 'rope-chain-18k',
        description: 'Elegant rope chain in solid 18K yellow gold. 20 inches long with secure lobster clasp.',
        descriptionEs: 'Elegante cadena rope en oro amarillo sólido de 18K. 20 pulgadas de largo con cierre seguro de langosta.',
        price: 3200,
        currency: 'USD',
        metalType: 'gold',
        karat: '18k',
        stoneType: 'none',
        category: 'chains',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
        ]),
        isFeatured: false,
        isBestSeller: false,
        inventoryQty: 8,
        weight: 28.5,
        length: 20,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Solitaire Diamond Necklace',
        nameEs: 'Collar de Diamante Solitario',
        slug: 'solitaire-diamond-necklace',
        description: 'Elegant solitaire diamond pendant featuring a 0.75 carat round brilliant diamond on an 18K white gold chain.',
        descriptionEs: 'Elegante colgante de diamante solitario con un diamante redondo brillante de 0.75 quilates en una cadena de oro blanco de 18K.',
        price: 3750,
        currency: 'USD',
        metalType: 'gold',
        karat: '18k',
        stoneType: 'natural',
        category: 'necklaces',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800',
        ]),
        isFeatured: true,
        isBestSeller: false,
        inventoryQty: 6,
        weight: 5.2,
        length: 18,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Lab Diamond Eternity Band',
        nameEs: 'Anillo Eternity de Diamantes de Laboratorio',
        slug: 'lab-diamond-eternity-band',
        description: 'Beautiful eternity band featuring lab-created diamonds in 14K white gold. Perfect for stacking or as a wedding band.',
        descriptionEs: 'Hermoso anillo eternity con diamantes creados en laboratorio en oro blanco de 14K. Perfecto para apilar o como anillo de boda.',
        price: 1850,
        currency: 'USD',
        metalType: 'gold',
        karat: '14k',
        stoneType: 'lab',
        category: 'rings',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800',
        ]),
        isFeatured: false,
        isBestSeller: true,
        inventoryQty: 12,
        weight: 2.8,
        sizes: JSON.stringify(['5', '6', '7', '8', '9']),
      },
    }),
  ])

  console.log(`Created ${products.length} products`)

  // Create collections
  const collections = await Promise.all([
    prisma.collection.create({
      data: {
        name: 'Best Sellers',
        nameEs: 'Más Vendidos',
        slug: 'best-sellers',
        description: 'Our most loved pieces',
        descriptionEs: 'Nuestras piezas más amadas',
        sortOrder: 1,
      },
    }),
    prisma.collection.create({
      data: {
        name: 'Diamond Rings',
        nameEs: 'Anillos de Diamantes',
        slug: 'diamond-rings',
        description: 'Stunning diamond rings for every occasion',
        descriptionEs: 'Impresionantes anillos de diamantes para cada ocasión',
        sortOrder: 2,
      },
    }),
    prisma.collection.create({
      data: {
        name: 'Gold Chains',
        nameEs: 'Cadenas de Oro',
        slug: 'gold-chains',
        description: 'Classic and modern gold chains',
        descriptionEs: 'Cadenas de oro clásicas y modernas',
        sortOrder: 3,
      },
    }),
    prisma.collection.create({
      data: {
        name: 'Bridal Collection',
        nameEs: 'Colección Nupcial',
        slug: 'bridal',
        description: 'Perfect pieces for your special day',
        descriptionEs: 'Piezas perfectas para tu día especial',
        sortOrder: 4,
      },
    }),
  ])

  console.log(`Created ${collections.length} collections`)

  // Link products to collections
  const bestSellersCollection = collections.find(c => c.slug === 'best-sellers')!
  const ringsCollection = collections.find(c => c.slug === 'diamond-rings')!
  const chainsCollection = collections.find(c => c.slug === 'gold-chains')!

  const bestSellerProducts = products.filter(p => p.isBestSeller)
  const ringProducts = products.filter(p => p.category === 'rings')
  const chainProducts = products.filter(p => p.category === 'chains')

  await Promise.all([
    ...bestSellerProducts.map((p, i) =>
      prisma.collectionProduct.create({
        data: {
          collectionId: bestSellersCollection.id,
          productId: p.id,
          sortOrder: i,
        },
      })
    ),
    ...ringProducts.map((p, i) =>
      prisma.collectionProduct.create({
        data: {
          collectionId: ringsCollection.id,
          productId: p.id,
          sortOrder: i,
        },
      })
    ),
    ...chainProducts.map((p, i) =>
      prisma.collectionProduct.create({
        data: {
          collectionId: chainsCollection.id,
          productId: p.id,
          sortOrder: i,
        },
      })
    ),
  ])

  console.log('Linked products to collections')
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
