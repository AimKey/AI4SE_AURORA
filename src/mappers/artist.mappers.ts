// // apps/backend/src/mappers/artist.mappers.ts
// import { toU, toDateU, toNumberOr } from "../utils/normalize";
// // import {type ArtistDetailDTO} from "../types/artists.dtos";
// /**
//  * Map service document to DTO
//  */
// // export function mapServiceDoc(doc: any): ArtistDetailDTO['services'][0] {
// //   return {
// //     id: String(doc._id),
// //     name: toU(doc.name),
// //     description: toU(doc.description),
// //     price: toNumberOr(doc.price),
// //     duration: toNumberOr(doc.duration),
// //     isAvailable: Boolean(doc.isAvailable),
// //   };
// // }

// /**
//  * Map portfolio document to DTO
//  */
// export function mapPortfolioDoc(doc: any): ArtistDetailDTO['portfolio'][0] {
//   return {
//     id: String(doc._id),
//     title: toU(doc.title),
//     description: toU(doc.description),
//     category: toU(doc.category),
//     createdAt: toDateU(doc.createdAt),
//     media: (doc.media ?? []).map((m: any) => ({
//       mediaType: toU(m.mediaType),
//       url: m.url,
//       caption: toU(m.caption),
//       displayOrder: toNumberOr(m.displayOrder),
//       category: toU(m.category),
//     })),
//   };
// }

// /**
//  * Map certificate document to DTO
//  */
// export function mapCertificateDoc(doc: any): ArtistDetailDTO['certificates'][0] {
//   return {
//     id: String(doc._id),
//     title: toU(doc.title),
//     issuer: toU(doc.issuer),
//     description: toU(doc.description),
//     issueDate: toDateU(doc.issueDate),
//     expireDate: toDateU(doc.expireDate),
//     imageUrl: toU(doc.imageUrl),
//   };
// }

