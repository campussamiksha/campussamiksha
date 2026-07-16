import { PrismaClient, InstitutionType, OwnershipType } from "@prisma/client";
import { RATING_PARAMETERS } from "../lib/ratingParameters";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Starter directory of well-known Indian academic employers. Accreditation/rank
// fields are left null where not confidently known — load official NIRF/UGC data
// separately rather than guessing. Extend this list from public datasets.
type Seed = {
  name: string;
  type: InstitutionType;
  ownership: OwnershipType;
  city: string;
  state: string;
  aka?: string[];
  ugc?: boolean;
};

const INSTITUTIONS: Seed[] = [
  { name: "Indian Institute of Technology Bombay", type: "institute_of_national_importance", ownership: "government", city: "Mumbai", state: "Maharashtra", aka: ["IIT Bombay", "IITB"] },
  { name: "Indian Institute of Technology Delhi", type: "institute_of_national_importance", ownership: "government", city: "New Delhi", state: "Delhi", aka: ["IIT Delhi", "IITD"] },
  { name: "Indian Institute of Technology Madras", type: "institute_of_national_importance", ownership: "government", city: "Chennai", state: "Tamil Nadu", aka: ["IIT Madras", "IITM"] },
  { name: "Indian Institute of Technology Kanpur", type: "institute_of_national_importance", ownership: "government", city: "Kanpur", state: "Uttar Pradesh", aka: ["IIT Kanpur", "IITK"] },
  { name: "Indian Institute of Technology Kharagpur", type: "institute_of_national_importance", ownership: "government", city: "Kharagpur", state: "West Bengal", aka: ["IIT Kharagpur", "IIT KGP"] },
  { name: "Indian Institute of Science", type: "institute_of_national_importance", ownership: "government", city: "Bengaluru", state: "Karnataka", aka: ["IISc"] },
  { name: "Indian Institute of Management Ahmedabad", type: "institute_of_national_importance", ownership: "government", city: "Ahmedabad", state: "Gujarat", aka: ["IIM Ahmedabad", "IIMA"] },
  { name: "Indian Institute of Management Bangalore", type: "institute_of_national_importance", ownership: "government", city: "Bengaluru", state: "Karnataka", aka: ["IIM Bangalore", "IIMB"] },
  { name: "National Institute of Technology Tiruchirappalli", type: "institute_of_national_importance", ownership: "government", city: "Tiruchirappalli", state: "Tamil Nadu", aka: ["NIT Trichy"] },
  { name: "National Institute of Technology Karnataka", type: "institute_of_national_importance", ownership: "government", city: "Surathkal", state: "Karnataka", aka: ["NITK", "NIT Surathkal"] },
  { name: "Jawaharlal Nehru University", type: "central_university", ownership: "government", city: "New Delhi", state: "Delhi", aka: ["JNU"], ugc: true },
  { name: "University of Delhi", type: "central_university", ownership: "government", city: "New Delhi", state: "Delhi", aka: ["DU"], ugc: true },
  { name: "Banaras Hindu University", type: "central_university", ownership: "government", city: "Varanasi", state: "Uttar Pradesh", aka: ["BHU"], ugc: true },
  { name: "University of Hyderabad", type: "central_university", ownership: "government", city: "Hyderabad", state: "Telangana", aka: ["UoH", "HCU"], ugc: true },
  { name: "Aligarh Muslim University", type: "central_university", ownership: "government", city: "Aligarh", state: "Uttar Pradesh", aka: ["AMU"], ugc: true },
  { name: "Jamia Millia Islamia", type: "central_university", ownership: "government", city: "New Delhi", state: "Delhi", aka: ["JMI"], ugc: true },
  { name: "Savitribai Phule Pune University", type: "state_university", ownership: "government", city: "Pune", state: "Maharashtra", aka: ["SPPU", "Pune University"], ugc: true },
  { name: "Anna University", type: "state_university", ownership: "government", city: "Chennai", state: "Tamil Nadu", aka: ["AU"], ugc: true },
  { name: "Birla Institute of Technology and Science, Pilani", type: "deemed_university", ownership: "trust_society", city: "Pilani", state: "Rajasthan", aka: ["BITS Pilani"], ugc: true },
  { name: "Vellore Institute of Technology", type: "deemed_university", ownership: "trust_society", city: "Vellore", state: "Tamil Nadu", aka: ["VIT"], ugc: true },
  { name: "Manipal Academy of Higher Education", type: "deemed_university", ownership: "trust_society", city: "Manipal", state: "Karnataka", aka: ["MAHE", "Manipal University"], ugc: true },
  { name: "Amity University", type: "private_university", ownership: "private_unaided", city: "Noida", state: "Uttar Pradesh", aka: ["Amity"], ugc: true },
  { name: "Shiv Nadar Institution of Eminence", type: "private_university", ownership: "private_unaided", city: "Greater Noida", state: "Uttar Pradesh", aka: ["Shiv Nadar University", "SNU"], ugc: true },
  { name: "Ashoka University", type: "private_university", ownership: "private_unaided", city: "Sonipat", state: "Haryana", aka: ["Ashoka"], ugc: true },
  { name: "Indian Institute of Science Education and Research Pune", type: "institute_of_national_importance", ownership: "government", city: "Pune", state: "Maharashtra", aka: ["IISER Pune"] },
  { name: "Tata Institute of Fundamental Research", type: "research_institute", ownership: "government", city: "Mumbai", state: "Maharashtra", aka: ["TIFR"] },
  { name: "Council of Scientific and Industrial Research", type: "research_institute", ownership: "government", city: "New Delhi", state: "Delhi", aka: ["CSIR"] },
  { name: "All India Institute of Medical Sciences, New Delhi", type: "institute_of_national_importance", ownership: "government", city: "New Delhi", state: "Delhi", aka: ["AIIMS Delhi"] },
];

async function main() {
  console.log("Seeding rating parameters…");
  for (const p of RATING_PARAMETERS) {
    await prisma.ratingParameter.upsert({
      where: { id: p.id },
      update: {
        code: p.code,
        label: p.label,
        description: p.description,
        applicableCategories: p.applicableCategories,
        isCore: p.isCore,
        displayOrder: p.displayOrder,
      },
      create: {
        id: p.id,
        code: p.code,
        label: p.label,
        description: p.description,
        applicableCategories: p.applicableCategories,
        isCore: p.isCore,
        displayOrder: p.displayOrder,
      },
    });
  }

  console.log(`Seeding ${INSTITUTIONS.length} institutions…`);
  for (const inst of INSTITUTIONS) {
    const slug = slugify(inst.name);
    await prisma.institution.upsert({
      where: { slug },
      update: {},
      create: {
        name: inst.name,
        slug,
        aka: inst.aka ?? [],
        type: inst.type,
        ownership: inst.ownership,
        city: inst.city,
        state: inst.state,
        ugcRecognized: inst.ugc ?? null,
      },
    });
  }

  // Initial moderator/admin account so the moderation console is reachable.
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@campussamiksha.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "admin", isEmailVerified: true },
    create: {
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "admin",
      isEmailVerified: true,
      maxBadge: "email_verified",
      displayHandle: "admin",
    },
  });
  console.log(`Admin account ready: ${adminEmail}`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
