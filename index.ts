const dataStack: any[] = [];
const env = Object.create(window);

class VM {
    top(stack: any[]) {
        return stack[stack.length - 1];
    }
    dup(stack: any[]) {
        stack.push(this.top(stack));
    }
    ['+'](stack: any[]) {
        const a = stack.pop();
        const b = stack.pop();
        stack.push(b + a);
    }
    ['-'](stack: any[]) {
        const a = stack.pop();
        const b = stack.pop();
        stack.push(b - a);
    }
    ['*'](stack: any[]) {
        const a = stack.pop();
        const b = stack.pop();
        stack.push(b * a);
    }
    ['/'](stack: any[]) {
        const a = stack.pop();
        const b = stack.pop();
        stack.push(b / a);
    }
    ['='](stack: any[]) {
        const a = stack.pop();
        const b = stack.pop();
        stack.push(b === a);
    }
    ['>'](stack: any[]) {
        const a = stack.pop();
        const b = stack.pop();
        stack.push(b > a);
    }
    not(stack: any[]) {
        stack.push(!stack.pop());
    }
}

const primitives = new Map<string, string>([
    ['dup', 'vm.dup(h)'],
    ['drop', 'h.pop()'],
    ['+', 'vm["+"](h)'],
    ['-', 'vm["-"](h)'],
    ['*', 'vm["*"](h)'],
    ['/', 'vm["/"](h)'],
    ['>', 'vm[">"](h)'],
    ['=', 'vm["="](h)'],
    ['not', 'vm.not(h)'],
    ['spew', 'console.log(vm.top(h))'],
    ['package', 'e = Object.create(e)'],
    ['endpackage', 'h.push(e); e = Object.getPrototypeOf(e)'],
]);

function parse(source: string): string[] {
    const tokens = source.match(/\s*((".*?")|([^\s]*))/g)?.map(x => x.trim()).filter(x => x);
    if (tokens) return tokens;

    throw new Error('Failed to parse: ' + source);
}

function compile(tokens: string[]): string {
    let body = "";
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const primitive = primitives.get(token);
        if (primitive) {
            body += `${primitive};\n`;
            continue;
        }

        const num = Number(token);
        if (num) {
            body += `h.push(${num});\n`;
            continue;
        }

        if (token === ':') {
            const name = tokens[++i];
            if (!name) throw new Error("Expected name after ':' word");
            if (name === ';') throw new Error(`You can't name a word a ';'`);
            if (name === ':') throw new Error(`You can't name a word a ':'`);

            body += `e["${name}"] = (h, vm, e) => {\n`;

            const endIndex = tokens.indexOf(';', i);
            if (endIndex < 0) throw new Error(`Expected ';' to end definition of '${name}'`);
            body += compile(tokens.slice(++i, endIndex));

            body += `};\n`;

            i = endIndex;

            continue;
        }

        if (token === 'if') {
            body += `if (h.pop()) {\n`;

            const thenIndex = tokens.indexOf('then', i);
            if (thenIndex < 0) throw new Error(`Expected 'then' to end 'if'`);
            body += compile(tokens.slice(++i, thenIndex));

            body += `} else {\n`;

            i = thenIndex;

            const elseIndex = tokens.indexOf('else', i);
            if (elseIndex < 0) throw new Error(`Expected 'else' to end 'then'`);
            body += compile(tokens.slice(++i, elseIndex));

            body += `};\n`;

            i = elseIndex;

            continue;
        }

        if (token === 'if') {
        }

        body += `e["${token}"](h, vm, e);\n`;
    }

    return body;
}

function bootstrap(compiledProgram: string): (h: any[], vm: VM, e: object) => any[] {
    console.log('Bootstrapping:\n', compiledProgram);
    return Function('h', 'vm', 'e', compiledProgram) as (h: any[], vm: VM, e: object) => any[];
}

const program = `
: double dup + ;
: quadruple double double ;
1 quadruple
2 quadruple
*

dup 8 > not if
  double then
  quadruple else

: elem (name -- HTMLElement) @"document.createElement" %call-1d ;

"div" elem
. document body appendChild ; %call-1d
`;

const func = bootstrap(compile(parse(program)));
func(dataStack, new VM(), env);

console.log(dataStack);
