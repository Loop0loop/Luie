export type TemplateField = {
  key: string;
  labelKey: string;
  type: "text" | "textarea" | "select";
  optionKeys?: string[]; // For select type
  placeholderKey?: string;
};

export type CharacterTemplate = {
  id: string;
  nameKey: string;
  icon: string; // Lucide icon name or emoji
  fields: TemplateField[];
};

export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    id: "basic",
    nameKey: "character.templates.basic",
    icon: "User",
    fields: [
      { key: "age", labelKey: "character.fields.age", type: "text", placeholderKey: "character.placeholders.age.basic" },
      {
        key: "gender",
        labelKey: "character.fields.gender",
        type: "select",
        optionKeys: [
          "character.options.gender.male",
          "character.options.gender.female",
          "character.options.gender.other",
          "character.options.gender.unknown",
        ],
      },
      { key: "job", labelKey: "character.fields.job", type: "text", placeholderKey: "character.placeholders.job.basic" },
      { key: "affiliation", labelKey: "character.fields.affiliation", type: "text", placeholderKey: "character.placeholders.affiliation" },
      { key: "mbti", labelKey: "character.fields.mbti", type: "text", placeholderKey: "character.placeholders.mbti" },
    ],
  },
  {
    id: "fantasy",
    nameKey: "character.templates.fantasy",
    icon: "Sword",
    fields: [
      { key: "age", labelKey: "character.fields.age", type: "text", placeholderKey: "character.placeholders.age.fantasy" },
      {
        key: "gender",
        labelKey: "character.fields.gender",
        type: "select",
        optionKeys: [
          "character.options.gender.male",
          "character.options.gender.female",
          "character.options.gender.other",
          "character.options.gender.unknown",
        ],
      },
      { key: "race", labelKey: "character.fields.race", type: "text", placeholderKey: "character.placeholders.race" },
      { key: "class", labelKey: "character.fields.class", type: "text", placeholderKey: "character.placeholders.class" },
      { key: "rank", labelKey: "character.fields.rank", type: "text", placeholderKey: "character.placeholders.rank" },
      { key: "element", labelKey: "character.fields.element", type: "text", placeholderKey: "character.placeholders.element" },
      { key: "affiliation", labelKey: "character.fields.affiliationGuild", type: "text" },
      { key: "ability", labelKey: "character.fields.ability", type: "textarea", placeholderKey: "character.placeholders.ability" },
    ],
  },
  {
    id: "romance",
    nameKey: "character.templates.romance",
    icon: "Heart",
    fields: [
      { key: "age", labelKey: "character.fields.age", type: "text" },
      { key: "job", labelKey: "character.fields.jobTitle", type: "text", placeholderKey: "character.placeholders.job.romance" },
      { key: "status", labelKey: "character.fields.status", type: "text", placeholderKey: "character.placeholders.status" },
      { key: "style", labelKey: "character.fields.style", type: "text", placeholderKey: "character.placeholders.style" },
      { key: "ideal", labelKey: "character.fields.ideal", type: "text" },
      { key: "rival", labelKey: "character.fields.rival", type: "text" },
      { key: "family", labelKey: "character.fields.family", type: "textarea" },
    ],
  },
  {
    id: "murim",
    nameKey: "character.templates.murim",
    icon: "Scroll",
    fields: [
      { key: "age", labelKey: "character.fields.age", type: "text" },
      { key: "sect", labelKey: "character.fields.sect", type: "text", placeholderKey: "character.placeholders.sect" },
      { key: "realm", labelKey: "character.fields.realm", type: "text", placeholderKey: "character.placeholders.realm" },
      { key: "title", labelKey: "character.fields.title", type: "text", placeholderKey: "character.placeholders.title" },
      { key: "martial_arts", labelKey: "character.fields.martialArts", type: "textarea" },
      { key: "weapon", labelKey: "character.fields.weapon", type: "text" },
    ],
  },
  {
    id: "modern",
    nameKey: "character.templates.modern",
    icon: "Briefcase",
    fields: [
      { key: "age", labelKey: "character.fields.age", type: "text" },
      { key: "job", labelKey: "character.fields.job", type: "text" },
      { key: "education", labelKey: "character.fields.education", type: "text" },
      { key: "wealth", labelKey: "character.fields.wealth", type: "text", placeholderKey: "character.placeholders.wealth" },
      { key: "hobby", labelKey: "character.fields.hobby", type: "text" },
      { key: "vehicle", labelKey: "character.fields.vehicle", type: "text" },
    ],
  },
];
