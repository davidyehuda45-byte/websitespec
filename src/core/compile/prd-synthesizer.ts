import type { LayoutNode, ProjectBlueprint } from '../../types/blueprint';

export interface SynthesizedComponent {
  name: string;
  targetFile: string;
  description: string;
  visualSpecs: {
    layout: string;
    dimensions: string;
    colors: string;
    borderRadius?: string;
    shadow?: string;
  };
  copywriting: string[];
  attributes: {
    placeholder?: string;
    ariaLabel?: string;
    href?: string;
  };
  codeTemplate: string;
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[a-z]/, (chr) => chr.toUpperCase())
    .replace(/^(V|Stel|El)([A-Z])/, '$2'); // Clean framework prefixes like v- or stel-
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Traverses the layout tree to identify distinct UI components (landmarks, IDs, controls).
 */
export function synthesizeComponentsFromBlueprint(
  project: ProjectBlueprint
): SynthesizedComponent[] {
  const components: SynthesizedComponent[] = [];
  const seenNames = new Set<string>();
  const stack = (project.targetStack || '').toLowerCase();

  const isBlade = stack.includes('laravel') || stack.includes('blade');
  const isVue = stack.includes('vue') || stack.includes('nuxt');

  const visitNode = (node: LayoutNode) => {
    // Check if node represents a distinct component candidate
    const isLandmark = ['header', 'nav', 'aside', 'footer'].includes(node.tag);
    const hasMeaningfulId = Boolean(node.id && !node.id.startsWith('__') && node.id !== 'root' && node.id !== 'app');
    const hasControlClass = Boolean(
      node.semanticClass &&
        /(search|pill|control|toolbar|drawer|menu|navbar|banner|modal|card|list-group|tbtcontainer)/i.test(
          node.semanticClass
        )
    );

    if (isLandmark || hasMeaningfulId || hasControlClass) {
      let rawName = node.id || (node.semanticClass ? node.semanticClass.split(' ')[0] : node.tag);
      let name = toPascalCase(rawName || 'Component');
      if (name.length < 3) name = `${toPascalCase(node.tag)}Component`;

      if (!seenNames.has(name)) {
        seenNames.add(name);

        const ext = isBlade ? '.blade.php' : isVue ? '.vue' : '.tsx';
        const folder = isBlade ? 'resources/views/components/' : isVue ? 'src/components/' : 'components/ui/';
        const filename = isBlade ? toKebabCase(name) : name;
        const targetFile = `${folder}${filename}${ext}`;

        // Collect texts
        const texts: string[] = [];
        const collectTexts = (n: LayoutNode) => {
          if (n.text && n.text.length < 80 && !n.text.startsWith('[')) {
            texts.push(n.text);
          }
          (n.children || []).forEach(collectTexts);
        };
        collectTexts(node);

        // Visual Specs
        const display = node.styles['display'] || 'flex';
        const width = node.styles['width'] || 'auto';
        const height = node.styles['height'] || 'auto';
        const bg = node.styles['background-color'] || 'transparent';
        const color = node.styles['color'] || 'inherit';
        const radius = node.styles['border-radius'];
        const shadow = node.styles['box-shadow'];

        const codeTemplate = generateComponentScaffolding(name, node, texts, isBlade, isVue);

        components.push({
          name,
          targetFile,
          description: `Komponen UI untuk elemen <${node.tag}> dengan identifier "${rawName}".`,
          visualSpecs: {
            layout: `Display: ${display}; Gap: ${node.styles['gap'] || 'normal'}`,
            dimensions: `Width: ${width}; Height: ${height}`,
            colors: `Background: ${bg}; Text: ${color}`,
            borderRadius: radius,
            shadow,
          },
          copywriting: texts.slice(0, 5),
          attributes: {
            placeholder: node.placeholder,
            ariaLabel: node.ariaLabel,
            href: node.href,
          },
          codeTemplate,
        });
      }
    }

    (node.children || []).forEach(visitNode);
  };

  project.pages.forEach((p) => visitNode(p.layoutTree));

  return components.slice(0, 15);
}

function generateComponentScaffolding(
  name: string,
  node: LayoutNode,
  texts: string[],
  isBlade: boolean,
  isVue: boolean
): string {
  const bg = node.styles['background-color'] || '';
  const radius = node.styles['border-radius'] || '';
  const textSample = texts[0] || '';
  const placeholder = node.placeholder || '';
  const ariaLabel = node.ariaLabel || '';

  if (isBlade) {
    return `{{-- Component: ${name} --}}
@props([
    'placeholder' => '${placeholder}',
    'ariaLabel' => '${ariaLabel}',
])

<div {{ $attributes->merge(['class' => 'flex items-center ${radius.includes('22px') ? 'rounded-full' : ''} ${bg ? `bg-[${bg}]` : ''} text-white px-4 py-2']) }}>
    ${placeholder ? `<input type="text" placeholder="{{ $placeholder }}" class="bg-transparent border-none outline-none text-sm w-full" />` : ''}
    ${textSample ? `<span>${textSample}</span>` : ''}
    {{ $slot }}
</div>`;
  }

  if (isVue) {
    return `<template>
  <div class="flex items-center ${radius.includes('22px') ? 'rounded-full' : ''} ${bg ? `bg-[${bg}]` : ''} text-white px-4 py-2">
    <slot>
      ${placeholder ? `<input type="text" :placeholder="placeholder" class="bg-transparent border-none outline-none text-sm w-full" />` : ''}
      ${textSample ? `<span>${textSample}</span>` : ''}
    </slot>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  placeholder?: string;
  ariaLabel?: string;
}>(), {
  placeholder: '${placeholder}',
  ariaLabel: '${ariaLabel}',
});
</script>`;
  }

  // React / Next.js
  return `import React from 'react';

interface ${name}Props {
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ${name}({
  placeholder = '${placeholder}',
  ariaLabel = '${ariaLabel}',
  className = '',
  children,
}: ${name}Props) {
  return (
    <div
      aria-label={ariaLabel}
      className={\`flex items-center ${radius.includes('22px') ? 'rounded-full' : ''} ${bg ? `bg-[${bg}]` : ''} text-white px-4 py-2 \${className}\`}
    >
      ${placeholder ? `<input type="text" placeholder={placeholder} className="bg-transparent border-none outline-none text-sm w-full" />` : ''}
      ${textSample ? `<span>${textSample}</span>` : ''}
      {children}
    </div>
  );
}`;
}

