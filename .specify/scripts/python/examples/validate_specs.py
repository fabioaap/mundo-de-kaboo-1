#!/usr/bin/env python3
"""
Exemplo: Validador de Specs

Este script demonstra como usar as ferramentas Python para criar
um validador automático de specs que verifica:
- Estrutura correta (user stories, requirements, etc)
- Constitution compliance
- Formatação Markdown
- Links quebrados
"""

from pathlib import Path
from typing import Dict, List
import re


class SpecValidator:
    """Validador de specs do projeto."""
    
    REQUIRED_SECTIONS = [
        "## User Scenarios & Testing",
        "## Requirements",
        "## Success Criteria",
        "## Constitution Compliance"
    ]
    
    def __init__(self, specs_dir: Path):
        self.specs_dir = specs_dir
        self.results = []
    
    def validate_all(self):
        """Valida todas as specs no diretório."""
        spec_files = list(self.specs_dir.glob("*/spec.md"))
        
        if not spec_files:
            print(f"⚠️  Nenhuma spec encontrada em {self.specs_dir}")
            return
        
        print(f"🔍 Validando {len(spec_files)} specs...\n")
        
        for spec_file in spec_files:
            self.validate_spec(spec_file)
        
        self.print_summary()
    
    def validate_spec(self, spec_file: Path):
        """Valida uma spec individual."""
        spec_name = spec_file.parent.name
        content = spec_file.read_text()
        
        checks = {
            "✅ Arquivo existe": True,
            "📋 Seções obrigatórias": self.check_required_sections(content),
            "📝 User stories priorizadas": self.check_priorities(content),
            "🎯 Given-When-Then": self.check_gwt_format(content),
            "🏛️ Constitution compliance": "## Constitution Compliance" in content,
            "📊 Success criteria": self.check_success_criteria(content),
            "🔗 Sem links quebrados": self.check_links(content, spec_file),
        }
        
        passed = sum(1 for v in checks.values() if v)
        total = len(checks)
        
        self.results.append({
            "name": spec_name,
            "checks": checks,
            "score": f"{passed}/{total}"
        })
        
        # Print resultado
        emoji = "✅" if passed == total else "⚠️" if passed >= total * 0.7 else "❌"
        print(f"{emoji} {spec_name} ({passed}/{total})")
        
        for check, passed in checks.items():
            status = "✅" if passed else "❌"
            print(f"   {status} {check}")
        print()
    
    def check_required_sections(self, content: str) -> bool:
        """Verifica se todas as seções obrigatórias existem."""
        return all(section in content for section in self.REQUIRED_SECTIONS)
    
    def check_priorities(self, content: str) -> bool:
        """Verifica se user stories têm prioridades (P1/P2/P3)."""
        priorities = re.findall(r"\(Priority: P[123]\)", content)
        return len(priorities) > 0
    
    def check_gwt_format(self, content: str) -> bool:
        """Verifica formato Given-When-Then."""
        has_given = "**Given**" in content
        has_when = "**When**" in content
        has_then = "**Then**" in content
        return has_given and has_when and has_then
    
    def check_success_criteria(self, content: str) -> bool:
        """Verifica se existem critérios de sucesso mensuráveis."""
        # Procura por padrões como SC-001, SC-002
        criteria = re.findall(r"SC-\d{3}", content)
        return len(criteria) >= 3  # Mínimo 3 critérios
    
    def check_links(self, content: str, spec_file: Path) -> bool:
        """Verifica se links relativos estão válidos."""
        # Procura por links Markdown: [texto](caminho)
        links = re.findall(r"\[([^\]]+)\]\(([^)]+)\)", content)
        spec_dir = spec_file.parent
        
        for text, link in links:
            # Ignora links externos (http/https)
            if link.startswith(("http://", "https://", "#")):
                continue
            
            # Verifica se arquivo existe
            target = (spec_dir / link).resolve()
            if not target.exists():
                return False
        
        return True
    
    def print_summary(self):
        """Imprime resumo da validação."""
        print("\n" + "=" * 60)
        print("📊 RESUMO DA VALIDAÇÃO")
        print("=" * 60 + "\n")
        
        total_specs = len(self.results)
        perfect_specs = sum(1 for r in self.results if r["score"].startswith(str(len(r["checks"]))))
        
        print(f"Total de specs: {total_specs}")
        print(f"Specs perfeitas: {perfect_specs} ({perfect_specs/total_specs*100:.0f}%)")
        print(f"Specs com problemas: {total_specs - perfect_specs}")
        
        if perfect_specs < total_specs:
            print("\n⚠️  Specs que precisam de atenção:")
            for result in self.results:
                score_parts = result["score"].split("/")
                if int(score_parts[0]) < int(score_parts[1]):
                    print(f"   • {result['name']} ({result['score']})")


def main():
    """Função principal."""
    # Localizar diretório de specs
    # Este script está em .specify/scripts/python/examples/
    # Precisamos voltar 3 níveis para chegar em .specify/
    project_root = Path(__file__).parent.parent.parent.parent.parent
    specs_dir = project_root / ".specify" / "specs"
    
    if not specs_dir.exists():
        print(f"❌ Diretório de specs não encontrado: {specs_dir}")
        return
    
    # Validar
    validator = SpecValidator(specs_dir)
    validator.validate_all()


if __name__ == "__main__":
    main()
