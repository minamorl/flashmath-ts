# Shared additions

- pkg-physics: parser constructor selects TexCommand entries with type=character and char metadata from the existing resolved extension table; parser.run dispatches those literal characters to braket/physics handlers. Registry only gains the six registration lines, and types/scanner stay unchanged.
- pkg-physics: optional frame tokenTransform (inherited) applies physics vector fonts during token allocation while respecting explicit font scopes; optional missingMessage preserves physics automatic-fence errors. Neither is installed for existing base/newcommand parses.
- pkg-physics: function flag op=2 extends invisible function application to physics fraction/operator arguments; existing op=1 behavior is unchanged.
- pkg-physics: argumentScope marks argument/subparse frames so braket bar handlers do not escape into separately parsed fraction and macro arguments; ordinary brace groups keep their existing scope.
