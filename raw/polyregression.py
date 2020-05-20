"""
Created on Mon Mar 30 12:10:59 2020
author: yuen

publisher : NL x KBTG
edit : katopz
"""

import numpy as np
import matplotlib.pyplot as plt

# Thailand COVID 19 Dataset

# Predict data
X = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
     14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
Y = [4, 4, 5, 6, 8, 8, 14, 14, 14, 19, 19, 19,
     19, 19, 25, 25, 25, 25, 32, 32, 33, 33, 33]

# Nonlinear Regression Analysis (Polynomial)
degree = 12
poly_fit = np.polyid(np.polyfit(X, Y, degree))

# Plot data
xx = np.linspace(0, 77, 100)
plt.plot(xx, poly_fit(xx), c='r', linestyle='-')
plt.title('Thailand Prediction Curve : Non-Linear Polynomial fitting')
plt.xlabel('days')
plt.ylabel('Confirm cases')
plt.axis([0, 100, 0, 3000])
plt.grid(True)
plt.scatter(X, Y)

plt.show()

# Predict data
print('Tomorrow will be ', poly_fit(77))
