import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetail } from './product-detail'

// Mock products database
const products = [
  {
    id: '1',
    name: '2.99 Carat Diamond Ring',
    nameEs: 'Anillo de Diamante 2.99 Quilates',
    slug: '2-99-carat-diamond-ring',
    description: 'Natural diamond with exceptional cut, clarity, and brilliance. Set in 14K white gold with a classic solitaire setting. Perfect for engagements or special occasions. This stunning ring features a GIA certified diamond with VVS1 clarity and E color grade.',
    descriptionEs: 'Diamante natural con corte, claridad y brillo excepcionales. Engastado en oro blanco de 14K con un clásico engaste solitario. Perfecto para compromisos u ocasiones especiales. Este impresionante anillo presenta un diamante certificado GIA con claridad VVS1 y grado de color E.',
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
      'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800',
    ]),
    isFeatured: true,
    isBestSeller: true,
    inventoryQty: 3,
    weight: 4.5,
    sizes: JSON.stringify(['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9']),
  },
  {
    id: '2',
    name: '1.75 Carat Diamond Ring',
    nameEs: 'Anillo de Diamante 1.75 Quilates',
    slug: '1-75-carat-diamond-ring',
    description: 'Beautiful pear-shaped diamond ring with exceptional clarity. Set in 18K white gold with a stunning halo setting that maximizes brilliance.',
    descriptionEs: 'Hermoso anillo de diamante en forma de pera con claridad excepcional. Engastado en oro blanco de 18K con un impresionante engaste halo que maximiza el brillo.',
    price: 9875,
    comparePrice: null,
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
  {
    id: '3',
    name: 'Cuban Link Chain 14K',
    nameEs: 'Cadena Eslabón Cubano 14K',
    slug: 'cuban-link-chain-14k',
    description: 'Classic Cuban link chain crafted in solid 14K yellow gold. 22 inches long with a secure lobster clasp. Perfect for layering or wearing alone. Each link is carefully crafted for maximum durability and shine.',
    descriptionEs: 'Cadena clásica de eslabón cubano en oro amarillo sólido de 14K. 22 pulgadas de largo con cierre seguro de langosta. Perfecta para capas o usar sola.',
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
    sizes: null,
  },
  {
    id: '4',
    name: 'Diamond Tennis Bracelet',
    nameEs: 'Pulsera Tenis de Diamantes',
    slug: 'diamond-tennis-bracelet',
    description: 'Stunning tennis bracelet featuring 5 carats of round brilliant diamonds set in 18K white gold. Secure clasp with safety lock.',
    descriptionEs: 'Impresionante pulsera tenis con 5 quilates de diamantes redondos brillantes engastados en oro blanco de 18K.',
    price: 8500,
    comparePrice: null,
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
    sizes: null,
  },
  {
    id: '5',
    name: 'Diamond Stud Earrings',
    nameEs: 'Aretes de Diamante',
    slug: 'diamond-stud-earrings',
    description: 'Classic diamond stud earrings featuring 1 carat total weight of round brilliant diamonds in 14K white gold with secure screw-back posts.',
    descriptionEs: 'Aretes clásicos de diamante con 1 quilate de peso total de diamantes redondos brillantes en oro blanco de 14K.',
    price: 2450,
    comparePrice: null,
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
    sizes: null,
  },
]

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = products.find((p) => p.slug === slug)

  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [JSON.parse(product.images)[0]],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = products.find((p) => p.slug === slug)

  if (!product) {
    notFound()
  }

  // Get related products (same category, excluding current)
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  return <ProductDetail product={product} relatedProducts={relatedProducts} />
}
