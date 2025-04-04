#include "mean.h"

double mean(int N_x, double *x) {
    double sum = 0.0;
    for (int i = 0; i < N_x; i++) {
        sum += x[i];
    }
    return sum / N_x;
}