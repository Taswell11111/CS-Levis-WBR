import os
import re

words_map = {
    r'\bcategorize(s|d)?\b': lambda m: 'categorise' + (m.group(1) or ''),
    r'\bcategorization\b': 'categorisation',
    r'\bsynthesize(s|d)?\b': lambda m: 'synthesise' + (m.group(1) or ''),
    r'\bsummarize(s|d)?\b': lambda m: 'summarise' + (m.group(1) or ''),
    r'\bprioritize(s|d)?\b': lambda m: 'prioritise' + (m.group(1) or ''),
    r'\boptimization\b': 'optimisation',
    r'\banalyze(s|d)?\b': lambda m: 'analyse' + (m.group(1) or ''),
    r'\bcustomization\b': 'customisation',
    r'\bcustomize(s|d)?\b': lambda m: 'customise' + (m.group(1) or ''),
}

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for pat, repl in words_map.items():
                if callable(repl):
                    new_content = re.sub(pat, repl, new_content, flags=re.IGNORECASE)
                else:
                    new_content = re.sub(pat, repl, new_content, flags=re.IGNORECASE)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
