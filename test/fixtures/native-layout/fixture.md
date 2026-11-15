## 1. 行内の数式

$\eta_B \circ F(f) = G(f) \circ \eta_A$

## 2. 可換図式（CD 環境）

$\eta : F \Rightarrow G$

$$
\begin{CD}
F(A) @>{F(f)}>> F(B) \\
@V{\eta_A}VV @VV{\eta_B}V \\
G(A) @>>{G(f)}> G(B)
\end{CD}
$$

## 3. モナドの結合律

$\mu \circ T\mu = \mu \circ \mu T$

$$
\begin{CD}
T^3 @>{T\mu}>> T^2 \\
@V{\mu T}VV @VV{\mu}V \\
T^2 @>>{\mu}> T
\end{CD}
$$

## 4. array による可換図式

$$
\begin{array}{ccc}
F(A) & \xrightarrow{\;F(f)\;} & F(B) \\
{\scriptstyle \eta_A}\big\downarrow & & \big\downarrow{\scriptstyle \eta_B} \\
G(A) & \xrightarrow[\;G(f)\;]{} & G(B)
\end{array}
$$

## 5. 一般の行列

$$
A = \begin{pmatrix}
a_{11} & a_{12} & \cdots & a_{1n} \\
a_{21} & a_{22} & \cdots & a_{2n} \\
\vdots & \vdots & \ddots & \vdots \\
a_{m1} & a_{m2} & \cdots & a_{mn}
\end{pmatrix}
$$

## 6. 仕切りつきのブロック行列と Schur 補行列

$A$

$$
M = \left[\begin{array}{c|c}
A & B \\ \hline
C & D
\end{array}\right], \qquad
\det M = \det A \cdot \det\!\left(D - C A^{-1} B\right)
$$

## 7. Jordan ブロックとその指数関数

$$
J = \begin{bmatrix}
\lambda & 1 & & \\
 & \lambda & \ddots & \\
 & & \ddots & 1 \\
 & & & \lambda
\end{bmatrix}
\quad\Longrightarrow\quad
e^{tJ} = e^{\lambda t}
\begin{bmatrix}
1 & t & \frac{t^2}{2!} & \cdots & \frac{t^{k-1}}{(k-1)!} \\
 & 1 & t & \ddots & \vdots \\
 & & \ddots & \ddots & \frac{t^2}{2!} \\
 & & & 1 & t \\
 & & & & 1
\end{bmatrix}
$$

## 8. Vandermonde の行列式

$$
\det\begin{pmatrix}
1 & x_1 & x_1^2 & \cdots & x_1^{n-1} \\
1 & x_2 & x_2^2 & \cdots & x_2^{n-1} \\
\vdots & \vdots & \vdots & \ddots & \vdots \\
1 & x_n & x_n^2 & \cdots & x_n^{n-1}
\end{pmatrix}
= \prod_{1 \le i < j \le n} (x_j - x_i)
$$

## 9. 揃えた式（二項分布）

$$
\begin{aligned}
P(X = k) &= \binom{n}{k} p^k (1-p)^{n-k}, \\
\mathbb{E}[X] &= np, \qquad \operatorname{Var}(X) = np(1-p)
\end{aligned}
$$

## 10. Stokes の定理

\[
\oint_{\partial \Sigma} \omega = \int_{\Sigma} d\omega
\]
