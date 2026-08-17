# -*- coding: utf-8 -*-
"""One-off script: merge บทที่3_....docx into project1-v33003.docx as a new file.

Inserts chapter 3 content right before the "บรรณานุกรม" (references) paragraph
of project1-v33003.docx, so the final order is: chapter 1, chapter 2, chapter 3,
references. Does not modify either source file; writes a new merged .docx.
"""
import os

from docx import Document
from docx.oxml.ns import qn
from docxcompose.composer import Composer

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, "project1-v33003.docx")
CH3 = os.path.join(HERE, "บทที่3_การวิเคราะห์และออกแบบระบบ.docx")
OUT = os.path.join(HERE, "project1-v33003-merged.docx")


def find_references_index(doc):
    body = doc.element.body
    for idx, el in enumerate(body):
        if el.tag == qn("w:p") and el.xpath("string(.)").strip() == "บรรณานุกรม":
            return idx
    raise RuntimeError("could not find บรรณานุกรม paragraph in base document")


def main():
    base = Document(BASE)
    ch3 = Document(CH3)

    insert_idx = find_references_index(base)
    print("inserting chapter 3 at body index", insert_idx)

    composer = Composer(base)
    composer.insert(insert_idx, ch3)
    composer.save(OUT)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
