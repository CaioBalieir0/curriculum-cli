import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().min(1),
  linkedin: z.string().min(1),
  github: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1)
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

export const resumeSchema = z.object({
  profile: profileSchema,
  skills: z.array(skillGroupSchema).min(1),
  experience: z.array(sectionItemSchema).min(1),
  projects: z.array(sectionItemSchema),
  education: z.array(educationItemSchema).min(1),
  languages: z.array(z.string().min(1)).min(1)
}).strict();

export const resumeConfigSchema = z.object({
  profile: profileSchema.partial().optional(),
  skills: z.array(skillGroupSchema).optional(),
  experience: z.array(sectionItemSchema).optional(),
  projects: z.array(sectionItemSchema).optional(),
  education: z.array(educationItemSchema).optional(),
  languages: z.array(z.string().min(1)).optional()
}).strict();

export type ResumeData = z.infer<typeof resumeSchema>;
export type ResumeConfig = z.infer<typeof resumeConfigSchema>;

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
