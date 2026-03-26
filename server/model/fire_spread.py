import numpy as np
from scipy.ndimage import convolve

def spread_fire(fire_grid, risk_matrix, wind=(0, 0), decay=0.98):
    """
    Performs one step of the Cellular Automaton correctly.
    Fire spread is determined by:
    1. Neighbors on fire (Diffusion Kernel)
    2. Local susceptibility (Risk Matrix)
    3. Wind Bias
    """
    # 1. Define Moore Neighborhood Kernel (Weighted more for neighbors to encourage spread)
    kernel = np.array([
        [0.1, 0.15, 0.1],
        [0.15, 0.0,  0.15],
        [0.1, 0.15, 0.1]
    ])

    # 2. Apply Wind Bias (Shift weights in direction of wind)
    wx, wy = wind
    if abs(wx) > 0 or abs(wy) > 0:
        for i in range(3):
            for j in range(3):
                di, dj = i - 1, j - 1
                dot_product = di * wy + dj * wx
                if dot_product > 0:
                    kernel[i, j] *= (1.0 + dot_product * 2.0)
        
        kernel /= kernel.sum() 

    # 3. Use convolution to see how much heat neighbors are providing
    reach = convolve(fire_grid, kernel, mode='constant', cval=0.0)

    # 4. Actual CA Transition Rule:
    # - If intensity > 0, it stays on fire provided there is risk (fuel).
    # - Neighbors ignite if 'reach' * 'risk_matrix' is strong.
    # - High risk cells spread fire exponentially faster.
    
    # High persistence (98%) ensures fire doesn't die out prematurely
    # Neighbors provide a massive heat boost based on local risk
    # We use a higher multiplier (3.0) for more aggressive 'effective' CA spread
    
    # Active zones (risk > 0.4) have virtually zero decay until fuel is exhausted
    effective_decay = np.where(risk_matrix > 0.4, 0.995, decay)
    
    new_fire = (fire_grid * 0.98 + reach * risk_matrix * 3.0) * effective_decay
    
    return np.clip(new_fire, 0, 1.0)

def simulate_fire(risk_matrix, steps=6, wind=(0, 0)):
    """
    Main entry point for simulation.
    Takes a 2D risk matrix (already calculated from ML model).
    Returns a list of 2D fire intensity grids.
    """
    side = risk_matrix.shape[0]
    fire_grid = np.zeros((side, side))
    
    # Ignite center as a 3x3 patch for more aggressive and realistic start
    center = side // 2
    for i in range(-1, 2):
        for j in range(-1, 2):
            if 0 <= center+i < side and 0 <= center+j < side:
                # Initial intensity based on local risk, minimum of 0.6 for visual impact
                fire_grid[center+i, center+j] = max(0.6, float(risk_matrix[center+i, center+j]))
    
    history = [fire_grid.copy()]
    current_state = fire_grid.copy()

    for _ in range(steps):
        current_state = spread_fire(current_state, risk_matrix, wind=wind)
        history.append(current_state.copy())

    return history