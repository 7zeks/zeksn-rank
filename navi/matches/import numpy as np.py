import numpy as np
import matplotlib.pyplot as plt
import sympy as sp

# 1. Dane wejściowe (np. z Zadania 6)
x_pts = [1.00, 1.05, 1.10, 1.15]
y_pts = [0.1924, 0.2414, 0.2933, 0.3492]
x_szukane = 1.09

# 2. Definiujemy zmienną symboliczną 'x' (tak jak w matematyce na kartce)
x = sp.Symbol('x')
wielomian = 0

n = len(x_pts)

# 3. Główna pętla algorytmu Lagrange'a
for i in range(n):
    L_i = 1
    for j in range(n):
        if i != j:
            # Tworzymy ułamki dokładnie tak, jak liczyliśmy to na kartce!
            L_i *= (x - x_pts[j]) / (x_pts[i] - x_pts[j])
    
    wielomian += y_pts[i] * L_i

# 4. Magia Pythona: automatyczne wymnożenie wszystkich nawiasów i uproszczenie
wielomian_uproszczony = sp.expand(wielomian)

print("--- Wyniki Obliczeń ---")
print("Postać wielomianu P(x):")
print(wielomian_uproszczony)

# Obliczenie wartości dla konkretnego x
wartosc = wielomian_uproszczony.subs(x, x_szukane)
print(f"\nWartość dla x = {x_szukane} wynosi: {wartosc:.6f}")

# 5. --- Interpretacja graficzna (Wykres) ---
# Zamiana symbolicznego wzoru na szybką funkcję do rysowania
funkcja = sp.lambdify(x, wielomian_uproszczony, 'numpy')

# Wygenerowanie 500 punktów X, żeby linia na wykresie była płynna i gładka
x_plot = np.linspace(min(x_pts) - 0.05, max(x_pts) + 0.05, 500)
y_plot = funkcja(x_plot)

# Konfiguracja i wyświetlenie ładnego okienka z wykresem
plt.figure(figsize=(8, 5))
plt.plot(x_plot, y_plot, label="Wielomian Lagrange'a", color="blue")
plt.scatter(x_pts, y_pts, color="red", zorder=5, label="Węzły interpolacji")
plt.scatter([x_szukane], [wartosc], color="black", marker="x", s=100, zorder=6, label=f"Szukane x={x_szukane}")

plt.title("Interpolacja Lagrange'a (Python)")
plt.xlabel("Oś X")
plt.ylabel("Oś Y")
plt.grid(True, linestyle='--')
plt.legend()
plt.show() # To polecenie otwiera okno z interaktywnym wykresem