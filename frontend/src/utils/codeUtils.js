/**
 * Ensures that any C++ starter code or reference solution has:
 * #include <bits/stdc++.h>
 * using namespace std;
 */
export const ensureCppHeader = (code = "") => {
  const defaultCppBoilerplate = `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your logic here
    return 0;
}`;

  if (!code || typeof code !== "string" || !code.trim()) {
    return "";
  }

  let updated = code.trim();

  const hasBits = /#include\s*<bits\/stdc\+\+\.h>/i.test(updated);
  const hasNamespace = /using\s+namespace\s+std\s*;/i.test(updated);

  if (hasBits && hasNamespace) {
    return updated;
  }

  if (!hasBits) {
    if (/#include\s*<iostream>/i.test(updated)) {
      updated = updated.replace(/#include\s*<iostream>/i, "#include <bits/stdc++.h>");
    } else {
      updated = "#include <bits/stdc++.h>\n" + updated;
    }
  }

  if (!hasNamespace) {
    if (/#include\s*<bits\/stdc\+\+\.h>/i.test(updated)) {
      updated = updated.replace(
        /(#include\s*<bits\/stdc\+\+\.h>[^\r\n]*)/i,
        "$1\nusing namespace std;"
      );
    } else {
      updated = "using namespace std;\n" + updated;
    }
  }

  return updated;
};
