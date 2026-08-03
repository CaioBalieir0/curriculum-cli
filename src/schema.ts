import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().min(1),
  linkedin: z.string(),
  github: z.string(),
  portfolio: z.string().min(1).optional()
}).strict();

export const skillGroupSchema = z.object({
  category: z.string().min(1),
  items: z.array(z.string().min(1)).min(1)
}).strict();

export const sectionItemSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1)
}).strict();

export const educationItemSchema = z.object({
  title: z.string().min(1),
  details: z.array(z.string().min(1)).min(1)
}).strict();

export const cvSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  skills: z.array(skillGroupSchema).min(1),
  experience: z.array(sectionItemSchema).min(1),
  projects: z.array(sectionItemSchema),
  education: z.array(educationItemSchema).min(1),
  languages: z.array(z.string().min(1)).min(1)
}).strict();

export const coverLetterBulletSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1)
}).strict();

export const coverLetterSchema = z.object({
  date: z.string().min(1).optional(),
  greeting: z.string().min(1),
  opening: z.string().min(1),
  body: z.string().min(1),
  bullets: z.array(coverLetterBulletSchema),
  companyConnection: z.string().min(1),
  personalFit: z.string().min(1),
  final: z.string().min(1),
  closing: z.string().min(1)
}).strict();

const hasDocumentSection = (data: { cv?: unknown; coverLetter?: unknown }) => Boolean(data.cv || data.coverLetter);
const nothingToGenerateMessage = 'Nothing to generate. Provide at least one of "cv" or "coverLetter".';

export const generationSchema = z.object({
  profile: profileSchema,
  cv: cvSchema.optional(),
  coverLetter: coverLetterSchema.optional()
}).strict().refine(hasDocumentSection, {
  message: nothingToGenerateMessage
});

export const generationConfigSchema = z.object({
  profile: profileSchema.partial().optional(),
  cv: cvSchema.partial().optional(),
  coverLetter: coverLetterSchema.partial().optional()
}).strict();

export type Profile = z.infer<typeof profileSchema>;
export type CvData = z.infer<typeof cvSchema>;
export type CoverLetterData = z.infer<typeof coverLetterSchema>;
export type GenerationData = z.infer<typeof generationSchema>;
export type GenerationConfig = z.infer<typeof generationConfigSchema>;

export type CliOverrides = {
  title?: string;
  summary?: string;
  skills?: string;
  output?: string;
};

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `- ${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('\n');
}
