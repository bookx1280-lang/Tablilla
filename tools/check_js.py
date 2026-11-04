#!/usr/bin/env python3
"""Verificador ligero de balance de llaves/paréntesis/corchetes en JS.

Maneja strings, template literals (con ${} anidados y templates anidados),
comentarios y regex literales. No es un parser completo, pero detecta
desbalances estructurales sin necesidad de Node.
"""
import sys


class Checker:
    def __init__(self, src):
        self.s = src
        self.i = 0
        self.n = len(src)
        self.line = 1
        self.stack = []
        self.prev = ""  # último carácter significativo

    def err(self, msg):
        raise SystemExit(f"ERROR: {msg} (línea {self.line})")

    def advance(self):
        if self.s[self.i] == "\n":
            self.line += 1
        self.i += 1

    def skip_line_comment(self):
        while self.i < self.n and self.s[self.i] != "\n":
            self.i += 1

    def skip_block_comment(self):
        self.i += 2
        while self.i + 1 < self.n and not (self.s[self.i] == "*" and self.s[self.i + 1] == "/"):
            self.advance()
        self.i += 2

    def skip_string(self, q):
        self.i += 1
        while self.i < self.n:
            c = self.s[self.i]
            if c == "\\":
                self.i += 2
                continue
            if c == q:
                self.i += 1
                return
            self.advance()
        self.err("string sin cerrar")

    def skip_template(self):
        self.i += 1  # backtick
        while self.i < self.n:
            c = self.s[self.i]
            if c == "\\":
                self.i += 2
                continue
            if c == "`":
                self.i += 1
                return
            if c == "$" and self.i + 1 < self.n and self.s[self.i + 1] == "{":
                self.i += 2
                self.skip_expression_until_brace()
                continue
            self.advance()
        self.err("template sin cerrar")

    def skip_expression_until_brace(self):
        depth = 1
        while self.i < self.n and depth > 0:
            c = self.s[self.i]
            if c == "{":
                depth += 1
                self.i += 1
            elif c == "}":
                depth -= 1
                self.i += 1
            elif c in "\"'":
                self.skip_string(c)
            elif c == "`":
                self.skip_template()
            elif c == "/" and self.i + 1 < self.n and self.s[self.i + 1] == "/":
                self.skip_line_comment()
            elif c == "/" and self.i + 1 < self.n and self.s[self.i + 1] == "*":
                self.skip_block_comment()
            elif c == "/":
                # Posible regex dentro de la expresión
                self.skip_regex()
            else:
                self.advance()

    def skip_regex(self):
        self.i += 1
        in_class = False
        while self.i < self.n:
            c = self.s[self.i]
            if c == "\\":
                self.i += 2
                continue
            if c == "[":
                in_class = True
            elif c == "]":
                in_class = False
            elif c == "/" and not in_class:
                self.i += 1
                break
            elif c == "\n":
                self.err("regex sin cerrar")
            self.i += 1
        while self.i < self.n and self.s[self.i].isalpha():
            self.i += 1

    def run(self):
        regex_starters = set("(,=:[!&|?{};+-*%<>~^")
        while self.i < self.n:
            c = self.s[self.i]
            if c in " \t\r\n":
                self.advance()
                continue
            if c == "/" and self.i + 1 < self.n and self.s[self.i + 1] == "/":
                self.skip_line_comment()
                continue
            if c == "/" and self.i + 1 < self.n and self.s[self.i + 1] == "*":
                self.skip_block_comment()
                continue
            if c == "/":
                if self.prev == "" or self.prev in regex_starters:
                    self.skip_regex()
                    self.prev = "r"
                    continue
                self.i += 1
                self.prev = "/"
                continue
            if c in "\"'":
                self.skip_string(c)
                self.prev = "s"
                continue
            if c == "`":
                self.skip_template()
                self.prev = "s"
                continue
            if c in "{([":
                self.stack.append((c, self.line))
                self.prev = c
                self.i += 1
                continue
            if c in "})]":
                if not self.stack:
                    self.err(f"cierre inesperado '{c}'")
                o, l = self.stack.pop()
                if {"}": "{", ")": "(", "]": "["}[c] != o:
                    self.err(f"se esperaba cerrar '{o}' abierto en línea {l}, llegó '{c}'")
                self.prev = c
                self.i += 1
                continue
            self.prev = c
            self.i += 1

        if self.stack:
            o, l = self.stack[-1]
            self.err(f"'{o}' abierto en línea {l} sin cerrar")
        return True


def main():
    ok = True
    for path in sys.argv[1:]:
        src = open(path, encoding="utf-8").read()
        try:
            Checker(src).run()
            print(f"OK  {path}")
        except SystemExit as e:
            print(f"FAIL {path}: {e}")
            ok = False
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
