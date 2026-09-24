"""Apply hand-checked LaTeX solutions to the website study-data file."""

import json
from pathlib import Path

from curated_official_2026 import SOLUTIONS as SOLUTIONS_2026
from curated_official_2025 import SOLUTIONS as SOLUTIONS_2025
from curated_official_2024 import SOLUTIONS as SOLUTIONS_2024
from curated_official_2023 import SOLUTIONS as SOLUTIONS_2023
from curated_official_2022 import SOLUTIONS as SOLUTIONS_2022
from curated_official_2017 import SOLUTIONS as SOLUTIONS_2017
from curated_official_2015 import SOLUTIONS as SOLUTIONS_2015
from curated_official_2014 import SOLUTIONS as SOLUTIONS_2014
from curated_official_2013 import SOLUTIONS as SOLUTIONS_2013
from curated_official_2012 import SOLUTIONS as SOLUTIONS_2012
from curated_official_2011 import SOLUTIONS as SOLUTIONS_2011
from curated_official_2010 import SOLUTIONS as SOLUTIONS_2010
from curated_official_2009 import SOLUTIONS as SOLUTIONS_2009
from curated_official_2008 import SOLUTIONS as SOLUTIONS_2008
from curated_official_2007 import SOLUTIONS as SOLUTIONS_2007
from curated_official_2006 import SOLUTIONS as SOLUTIONS_2006
from curated_official_2005 import SOLUTIONS as SOLUTIONS_2005
from curated_official_2004 import SOLUTIONS as SOLUTIONS_2004
from curated_official_2003 import SOLUTIONS as SOLUTIONS_2003
from curated_official_2001 import SOLUTIONS as SOLUTIONS_2001


ROOT = Path(__file__).resolve().parents[1]
STUDY_FILE = ROOT / "dist" / "solutions-data.json"


def main() -> None:
    study = json.loads(STUDY_FILE.read_text(encoding="utf-8"))
    for task_id, solution in {
        **SOLUTIONS_2022,
        **SOLUTIONS_2017,
        **SOLUTIONS_2015,
        **SOLUTIONS_2014,
        **SOLUTIONS_2013,
        **SOLUTIONS_2012,
        **SOLUTIONS_2011,
        **SOLUTIONS_2010,
        **SOLUTIONS_2009,
        **SOLUTIONS_2008,
        **SOLUTIONS_2007,
        **SOLUTIONS_2006,
        **SOLUTIONS_2005,
        **SOLUTIONS_2004,
        **SOLUTIONS_2003,
        **SOLUTIONS_2001,
        **SOLUTIONS_2023,
        **SOLUTIONS_2024,
        **SOLUTIONS_2025,
        **SOLUTIONS_2026,
    }.items():
        study["tasks"][task_id]["solution"] = solution

    study["tasks"]["2026-3"]["answer"] = r"Неравенство следует из сравнения с независимой копией \(\xi'\) и двух оценок для \(\mathbb P(|\xi-\xi'|\geqslant x)\)."
    study["tasks"]["2026-10"]["answer"] = r"Остановить винеровский процесс на уровне \(-1\) и ускорить время по закону \(t/(1-t)\)."
    study["tasks"]["2026-11"]["answer"] = r"Совместная характеристическая функция факторизуется после доказательства \(\mathbb E(\phi_t\psi_t)=1\)."
    study["tasks"]["2025-1"]["answer"] = r"При \(N=4^m\) вероятность равна \(12/N-16/[N(N-2)]\)."
    study["tasks"]["2025-3"]["answer"] = r"При \(n=1\) да; при \(n\geqslant2\) нет."
    study["tasks"]["2025-8"]["answer"] = r"В пункте а) получается смесь условных распределений с указанной плотностью; стандартного закона Коши нет из-за знака \(+\) в знаменателе."
    study["tasks"]["2023-8"]["answer"] = r"Пункт а) верен только при \(\operatorname{Var}(X_1)>0\); тогда в пункте б) можно взять \(b_n=n^{3/2}\), и предельная дисперсия равна \(\operatorname{Var}(X_1)/3\)."
    study["tasks"]["2022-10"]["answer"] = r"Статистика \(\|\sum_{j=1}^{n}X_j\|^2/n\) имеет предельный закон \(\operatorname{Exp}(1)\) при равномерном источнике."
    study["version"] = 3
    STUDY_FILE.write_text(json.dumps(study, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
